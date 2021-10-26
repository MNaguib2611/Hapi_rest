const Hapi   = require('@hapi/hapi');
const Boom   = require('boom');
const Joi    = require('@hapi/joi');
Joi.objectId = require('joi-objectid')(Joi);




const init = async () => {

    const dbOpts = {
        url: 'mongodb://localhost:27017/sample_mflix',
        // url: 'mongodb+srv://main.zxsxp.mongodb.net/sample_mflix?retryWrites=true&w=majority',
          
        settings: {
            useUnifiedTopology: true
        },
        decorate: true
    };

    const server = Hapi.server({
        port: 5000,
        host: 'localhost'
    });

    await server.register({
        plugin: require('hapi-mongodb'),
        options: dbOpts
    });


    // Get all movies
    server.route({
        method: 'GET',
        path: '/movies',
        handler: async (req, h) => {
            const offset = Number(req.query.offset) || 0;
            const movies = await req.mongo.db.collection('movies').find({}).sort({metacritic:-1}).skip(offset).limit(20).toArray();
            return movies;
        }
    });

    // Add a new movie to the database
    server.route({
        method: 'POST',
        path: '/movies',
        handler: async (req, h) => {
            const payload = req.payload
            const status = await req.mongo.db.collection('movies').insertOne(payload);
            return status;
        }
    });

    // Get a single movie
    server.route({
        method: 'GET',
        path: '/movies/{id}',
        handler: async (req, h) => {
            const id = req.params.id
            const ObjectID = req.mongo.ObjectID;
            const movie = await req.mongo.db.collection('movies').findOne({_id: new ObjectID(id)},{projection:{title:1,plot:1,cast:1,year:1, released:1}});
            return movie;
        }
    });

    // Update the details of a movie
    server.route({
        method: 'PUT',
        path: '/movies/{id}',
        options: {
            validate: {
                params: Joi.object({
                    id: Joi.objectId()
                })
            }
        },
        handler: async (req, h) => {
            const id = req.params.id
            const ObjectID = req.mongo.ObjectID;
            const payload = req.payload
            const status = await req.mongo.db.collection('movies').updateOne({_id: ObjectID(id)}, {$set: payload});
            return status;
        }
    });
    
    

    // Delete a movie from the database
    server.route({
        method: 'DELETE',
        path: '/movies/{id}',
        options: {
            validate: {
                params: Joi.object({
                    id: Joi.objectId()
                })
            }
        },
        handler: async (req, h) => {
            const id = req.params.id
            const ObjectID = req.mongo.ObjectID;
            const payload = req.payload
            const status = await req.mongo.db.collection('movies').deleteOne({_id: ObjectID(id)});
            return status;
        }
    });
    
    // Search for a movie
    server.route({
        method: 'GET',
        path: '/search',
        handler: async(req, h) => {
            const query = req.query.term;
            const results = await req.mongo.db.collection("movies").aggregate([
                {
                    $searchBeta: {
                        "search": {
                            "query": query,
                            "path":"title"
                        }
                    }
                },
                {
                    $project : {title:1, plot: 1}
                },
                {
                    $limit: 10
                }
                ]).toArray()
            return results;
        }
    });

    // // Transform non-boom errors into boom ones
    // server.ext('onPreResponse', (request, reply) => {
    //     // Transform only server errors 
    //     if (request.response.isBoom && request.response.isServer) {
    //     reply(boomify(request.response))
    //     } else {
    //     // Otherwise just continue with previous response
    //     reply.continue()
    //     }
    // });
    // function boomify (error) {
    //     // I'm using globals for some things (like sequelize), you should replace it with your sequelize instance
    //     if (error instanceof Core.db.sequelize.UniqueConstraintError) {
    //       let be = Boom.create(400, `child "${error.errors[0].path}" fails because ["${error.errors[0].path}" must be unique]`)
    //       be.output.payload.validation = {
    //         source: 'payload',
    //         keys: error.errors.map(e => e.path)
    //       }
    //       return be;
    //     } else {
    //       // If error wasn't found, return default boom internal error
    //       return Boom.internal('An internal server error', error);
    //     }
    //   }
    await server.start();
    console.log('Server running on %s', server.info.uri);
}

init();