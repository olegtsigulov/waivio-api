const { CronJob } = require( 'cron' );
const { WObject, ObjectType, UserWobjects } = require( '../../../database' ).models;
const { OBJECT_TYPE_TOP_EXPERTS_COUNT } = require( '../../constants' );
const _ = require( 'lodash' );

const getObjectTypeWobjects = async ( name ) => {
    try {
        const wobjects = await WObject.find( { object_type: name }, { _id: 0, author_permlink: 1 } );
        return { author_permlinks: _.map( wobjects, ( w ) => w.author_permlink, [] ) };
    } catch ( error ) {
        return { error };
    }
};

const getExpertsByAuthorPermlinks = async ( { author_permlinks, limit = 50 } ) => {
    try {
        const experts = await UserWobjects.aggregate( [
            { $match: { author_permlink: { $in: author_permlinks } } },
            { $group: { _id: '$user_name', total_weight: { $sum: '$weight' } } },
            { $sort: { total_weight: -1 } },
            { $limit: limit }
        ] );
        return { experts };
    } catch ( error ) {
        return { error };
    }
};

const getExpertsByType = async ( objectTypeName ) => {
    const { author_permlinks, error } = await getObjectTypeWobjects( objectTypeName );
    if( error ) return { error };
    let{ experts, error: expError } = await getExpertsByAuthorPermlinks( { author_permlinks, limit: OBJECT_TYPE_TOP_EXPERTS_COUNT } );
    if( expError ) return { error: expError };
    experts = _.map( experts, ( ex ) => {
        return { name: ex._id, weight: ex.total_weight };
    } );
    return { experts };
};

const updateObjectTypeExperts = async () => {
    let cursor = ObjectType.find().cursor( { batchSize: 1000 } );
    let success_count = 0;
    await cursor.eachAsync( async ( doc ) => {
        const{ experts } = await getExpertsByType( doc.name );
        if( !_.isEmpty( experts ) ) {
            const res = await ObjectType.updateOne( { name: doc.name }, { $set: { top_experts: experts } } );
            if( res.nModified ) {
                success_count++;
            }
        }
    } );
    console.log( success_count + ' Object Types successfully updated with experts' );
};

const job = new CronJob( '0 0  */12 * * *', async () => {
    // update TOP experts for each ObjectType every 12 hours
    await updateObjectTypeExperts();
}, null, true, null, null, false );

job.start();

module.exports = updateObjectTypeExperts;