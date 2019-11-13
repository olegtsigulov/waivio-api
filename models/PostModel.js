const PostModel = require( '../database' ).models.Post;
const wObjectHelper = require( '../utilities/helpers/wObjectHelper' );
const { REQUIREDFIELDS } = require( '../utilities/constants' );
const AppModel = require( './AppModel' );
const _ = require( 'lodash' );

const getFeedByObjects = async function ( data ) { // data include objects(array of strings), limit, skip, locale, user
    try {
        let posts = await PostModel.aggregate( [
            {
                $match: {
                    $or: [
                        { 'wobjects.author_permlink': { $in: data.objects } },
                        { author: data.user } ]
                }
            },
            { $sort: { _id: -1 } },
            { $skip: data.skip },
            { $limit: data.limit },
            {
                $lookup: {
                    from: 'wobjects',
                    localField: 'wobjects.author_permlink',
                    foreignField: 'author_permlink',
                    as: 'fullObjects'
                }
            }
        ] );

        posts = await fillObjects( posts );
        return { posts };
    } catch ( error ) {
        return { error };
    }
}; // return posts of list wobjects and one specified author(use on user feed)

const getAllPosts = async function ( data ) {
    try {
        const aggregatePipeline = [
            { $sort: { _id: -1 } },
            { $skip: data.skip },
            { $limit: data.limit },
            {
                $lookup: {
                    from: 'wobjects',
                    localField: 'wobjects.author_permlink',
                    foreignField: 'author_permlink',
                    as: 'fullObjects'
                }
            }
        ];

        if ( data.filter ) {
            if ( data.filter.byApp ) {
                const { app } = await AppModel.getOne( { name: data.filter.byApp } );

                if ( app && app.supported_objects.length ) {
                    aggregatePipeline.unshift( {
                        $match: {
                            'wobjects.author_permlink': { $in: app.supported_objects }
                        }
                    } );
                }
            }
        }
        let posts = await PostModel.aggregate( aggregatePipeline );

        posts = await fillObjects( posts );
        return { posts };
    } catch ( error ) {
        return { error };
    }
};

const fillObjects = async ( posts, locale = 'en-US', wobjects_path = 'fullObjects' ) => {
    const fields = REQUIREDFIELDS.map( ( item ) => ( { name: item } ) );

    for ( const post of posts ) {
        for ( let wObject of post.wobjects ) {
            wObject = Object.assign( wObject, post[ wobjects_path ].find( ( i ) => i.author_permlink === wObject.author_permlink ) );
            wObjectHelper.formatRequireFields( wObject, locale, fields );
        }
        delete post[ wobjects_path ];
    }
    return posts;
};

const aggregate = async ( pipeline ) => {
    try {
        const posts = await PostModel.aggregate( pipeline );

        if( _.isEmpty( posts ) ) {
            return { error: { status: 404, message: 'Posts not found!' } };
        }
        return { posts };
    } catch ( error ) {
        return { error };
    }
};

const getByFollowLists = async ( { users, author_permlinks, skip, limit, user_languages, filtersData } ) => {
    try {
        let cond = {
            $or: [ { author: { $in: users } }, { 'wobjects.author_permlink': { $in: author_permlinks } } ]
        };
        if( _.get( filtersData, 'require_wobjects' ) ) {
            cond[ 'wobjects.author_permlink' ] = { $in: [ ...filtersData.require_wobjects ] };
        }
        if( !_.isEmpty( user_languages ) ) cond.language = { $in: user_languages };
        const posts = await PostModel.find( cond )
            .sort( { _id: -1 } )
            .skip( skip )
            .limit( limit )
            .populate( { path: 'fullObjects', select: '-latest_posts' } ).lean();

        if( _.isEmpty( posts ) ) {
            return { error: { status: 404, message: 'Posts not found!' } };
        }
        return { posts };
    } catch ( error ) {
        return { error };
    }
};

const getPostsRefs = async function( { skip = 0, limit = 1000 } = {} ) {
    try{
        return {
            posts: await PostModel.aggregate( [
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 0,
                        author: 1,
                        permlink: 1,
                        wobjects: 1
                    }
                }
            ] )
        };
    } catch ( error ) {
        return{ error };
    }
};

module.exports = { getFeedByObjects, getAllPosts, aggregate, fillObjects, getByFollowLists, getPostsRefs };
