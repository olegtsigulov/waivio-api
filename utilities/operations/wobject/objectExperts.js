const { UserWobjects } = require( '../../../models' );
const { WObject } = require( '../../../database' ).models;
const _ = require( 'lodash' );

const getMultipliers = ( newsFilter ) => {
    const array = _.flatten( newsFilter.allowList );
    const count = array.length;
    const values = _.uniq( array );

    return values.map( ( value ) => ( {
        author_permlink: value,
        multiplier: ( _.filter( newsFilter.allowList, ( items ) => _.includes( items, value ) ).length ) / count
    } ) );
};

const makeSwitchBranches = ( wobjects ) => {
    return wobjects.map( ( wobject ) => {
        return{
            case: { $eq: [ '$author_permlink', wobject.author_permlink ] },
            then: wobject.multiplier
        };
    } );
};

const makePipeline = ( { multipliers, skip = 0, limit = 30, username } ) => {
    const switchBranches = makeSwitchBranches( multipliers );

    const pipeline = [
        { $match: { author_permlink: { $in: multipliers.map( ( w ) => w.author_permlink ) } }
        },
        {
            $group: {
                _id: '$user_name',
                totalWeight: {
                    $sum: {
                        $multiply: [
                            '$weight',
                            {
                                $switch: {
                                    branches: switchBranches,
                                    default: 0
                                }
                            }
                        ]
                    }
                }
            }
        },
        { $sort: { totalWeight: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _id: 0, name: '$_id', weight: '$totalWeight' } }
    ];

    if( username ) {
        pipeline[ 0 ].$match.user_name = username;
    }
    return pipeline;
};

const getWobjExperts = async ( { author_permlink, skip = 0, limit = 30, username } ) => {
    let wobj;

    try{
        wobj = await WObject.findOne( { author_permlink } ).lean();

        if( !wobj ) {
            return { error: { status: 404, message: 'Wobject not found!' } };
        }
    } catch ( error ) {
        return { error };
    }
    if( !wobj.newsFilter ) {
        if( username ) {
            const { experts, error } = await UserWobjects.getByWobject( { author_permlink, skip, limit, username } );

            if( error ) {
                return { error };
            }
            return { experts };

        }
        const { experts, error } = await UserWobjects.getByWobject( { author_permlink, skip, limit } );

        if( error ) {
            return { error };
        }
        return { experts };
    }
    const multipliers = getMultipliers( wobj.newsFilter );
    const pipeline = makePipeline( { multipliers, skip, limit, username } );
    const { result: experts, error: aggregationError } = await UserWobjects.aggregate( pipeline );

    if( aggregationError ) {
        return { error: aggregationError };
    }
    return { experts };
};

module.exports = { getWobjExperts };