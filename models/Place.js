const mongose = require ('mongoose');

const PlaceSchema = new mongose.Schema({
    name: String, 
    descripcion : String,
    location: {
        type: {
            type: String,
            enum: ['Point'],
            dedault: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        }
    }
});

PlaceSchema.index({ location: '2dsphere' });

module.exports = mongose.model('Place', PlaceSchema);