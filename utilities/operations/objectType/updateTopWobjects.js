const { CronJob } = require( 'cron' );
const { WObject, ObjectType } = require( '../../../database' ).models;
const { OBJECT_TYPE_TOP_WOBJECTS_COUNT, LOW_PRIORITY_STATUS_FLAGS } = require( '../../constants' );

const updateObjectTypes = async ( isLog = false ) => {
    let cursor = ObjectType.find().cursor( { batchSize: 1000 } );

    await cursor.eachAsync( async ( doc ) => {
        const wobjs_array = await WObject.aggregate( [
            { $match: { object_type: doc.name } },
            { $addFields: {
                priority: {
                    $cond: {
                        if: { $in: [ '$status.title', LOW_PRIORITY_STATUS_FLAGS ] },
                        then: 0, else: 1
                    }
                }
            } },
            { $sort: { priority: -1, weight: -1, _id: -1 } },
            { $limit: OBJECT_TYPE_TOP_WOBJECTS_COUNT }
        ] );
        const author_permlinks = wobjs_array.map( ( p ) => p.author_permlink );
        const res = await ObjectType.updateOne( { _id: doc._id }, { $set: { top_wobjects: author_permlinks } } );

        if( res.nModified && isLog ) {
            console.log( `Object Type ${doc.name} updated! Add ${author_permlinks.length} wobjects refs!` );
        }
    } );
};

const job = new CronJob( '0 */30  * * * *', async () => {
    // update TOP wobjects for each ObjectType every 30 minutes
    await updateObjectTypes();
    console.log( 'Updating top wobjects by ObjectType finished!' );
}, null, true, null, null, false );

job.start();
module.exports = updateObjectTypes;
