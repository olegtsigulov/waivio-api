const WObjectModel = require( '../database' ).models.WObject;
const UserWobjectsModel = require( '../database' ).models.UserWobjects;
const createError = require( 'http-errors' );
const wObjectHelper = require( '../utilities/helpers/wObjectHelper' );
const rankHelper = require( '../utilities/helpers/rankHelper' );
const _ = require( 'lodash' );
const { REQUIREDFIELDS, REQUIREFIELDS_PARENT } = require( '../utilities/constants' );

const search = async function ( data ) {
    try {
        const wObjects = await WObjectModel.aggregate( [
            {
                $match: {
                    $and: [ {
                        $or: [ {
                            'fields':
                                {
                                    $elemMatch: {
                                        'name': 'name',
                                        'body': { $regex: `\\b${data.string}.*\\b`, $options: 'i' }
                                    }
                                }
                        },
                        { // if 4-th symbol is "-" - search by "author_permlink" too
                            'author_permlink': { $regex: `${_.get( data.string, '[3]' ) === '-' ? '^' + data.string : '_'}`, $options: 'i' }
                        } ]
                    }, {
                        object_type: { $regex: `^${data.object_type || '.+'}$`, $options: 'i' }
                    } ]
                }
            },
            { $sort: { weight: -1 } },
            { $limit: data.limit || 10 },
            { $skip: data.skip || 0 },
            {
                $addFields: {
                    'fields': {
                        $filter: {
                            input: '$fields',
                            as: 'field',
                            cond: {
                                $in: [ '$$field.name', REQUIREDFIELDS ]
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'wobjects',
                    localField: 'parent',
                    foreignField: 'author_permlink',
                    as: 'parent'
                }
            }
        ] );

        if( !wObjects || wObjects.length === 0 ) {
            return { wObjectsData: [] };
        }
        wObjects.forEach( ( wobject ) => {
            wobject.fields = _.orderBy( wobject.fields, [ 'weight' ], [ 'desc' ] );

            // format parent field
            if( Array.isArray( wobject.parent ) ) {
                if( _.isEmpty( wobject.parent ) ) {
                    wobject.parent = '';
                } else {
                    wobject.parent = wobject.parent[ 0 ];
                    getRequiredFields( wobject.parent, REQUIREFIELDS_PARENT );
                }
            }
        } );

        await rankHelper.calculateWobjectRank( wObjects ); // calculate rank for wobjects

        return { wObjectsData: wObjects };
    } catch ( error ) {
        return { error };
    }
};

const getOne = async function ( data ) { // get one wobject by author_permlink
    try {
        let required_fields = [ ...REQUIREDFIELDS ];
        let [ wObject ] = await WObjectModel.aggregate( [
            { $match: { author_permlink: data.author_permlink } },
            {
                $lookup: {
                    from: 'user_wobjects',
                    as: 'users',
                    let: { wobj_author_permlink: '$author_permlink' },
                    pipeline: [
                        { $match: { $expr: { $eq: [ '$author_permlink', '$$wobj_author_permlink' ] } } },
                        { $sort: { weight: -1 } },
                        { $limit: 10 },
                        {
                            $project: {
                                _id: 0,
                                name: '$user_name',
                                weight: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author_permlink',
                    foreignField: 'objects_follow',
                    as: 'followers'
                }
            },
            {
                $lookup: {
                    from: 'wobjects',
                    localField: 'parent',
                    foreignField: 'author_permlink',
                    as: 'parent'
                }
            }
        ] );

        if ( !wObject ) {
            return { error: createError( 404, 'wobject not found' ) };
        }

        // format parent field
        if( Array.isArray( wObject.parent ) ) {
            if( _.isEmpty( wObject.parent ) ) {
                wObject.parent = '';
            } else {
                wObject.parent = wObject.parent[ 0 ];
                getRequiredFields( wObject.parent, REQUIREFIELDS_PARENT );
            }
        }
        // format listItems field
        if ( await isFieldExist( { author_permlink: data.author_permlink, fieldName: 'listItem' } ) ) {
            const { wobjects, sortCustom } = await getList( data.author_permlink );
            const keyName = wObject.object_type.toLowerCase() === 'list' ? 'listItems' : 'menuItems';

            wObject[ keyName ] = wobjects;
            wObject.sortCustom = sortCustom;
            required_fields.push( 'sortCustom', 'listItem' );
        }
        // format gallery and adding rank of wobject
        wObject.preview_gallery = _.orderBy( wObject.fields.filter( ( field ) => field.name === 'galleryItem' ), [ 'weight' ], [ 'asc' ] ).slice( 0, 3 );
        wObject.albums_count = wObject.fields.filter( ( field ) => field.name === 'galleryAlbum' ).length;
        wObject.photos_count = wObject.fields.filter( ( field ) => field.name === 'galleryItem' ).length;
        await rankHelper.calculateWobjectRank( [ wObject ] ); // calculate rank for wobject

        wObject.followers_count = wObject.followers.length;
        delete wObject.followers;

        formatUsers( wObject );

        if ( data.required_fields && ( ( Array.isArray( data.required_fields ) && data.required_fields.length && data.required_fields.every( _.isString ) ) || _.isString( data.required_fields ) ) ) {
            if ( _.isString( data.required_fields ) ) {
                required_fields.push( data.required_fields );
            } else {
                required_fields.push( ...data.required_fields );
            }
        } // add additional fields to returning

        getRequiredFields( wObject, required_fields );
        if ( wObject.parent_objects ) {
            wObject.parent_objects.forEach( ( parent ) => getRequiredFields( parent, required_fields ) );
        }
        if ( wObject.child_objects ) {
            wObject.child_objects.forEach( ( child ) => getRequiredFields( child, required_fields ) );
        }

        if ( data.user ) {
            wObject.user = { weight: await wObjectHelper.getUserSharesInWobj( data.user, data.author_permlink ) };
            wObject.user.name = data.user;
            if ( wObject.user.weight ) {
                rankHelper.calculateForUsers( [ wObject.user ], wObject.weight );
            } else {
                wObject.user.rank = 0;
            }
        }
        return { wObjectData: wObject };
    } catch ( error ) {
        return { error };
    }
};

const getAll = async function ( data ) {
    try {
        const findParams = {};

        if ( data.author_permlinks && Array.isArray( data.author_permlinks ) && data.author_permlinks.length ) {
            findParams.author_permlink = { $in: data.author_permlinks };
        }
        if ( data.object_types && Array.isArray( data.object_types ) && data.object_types.length ) {
            findParams.object_type = { $in: data.object_types };
        } else if ( data.exclude_object_types && Array.isArray( data.exclude_object_types ) && data.exclude_object_types.length ) {
            findParams.object_type = { $nin: data.exclude_object_types };
        }

        let required_fields = [ ...REQUIREDFIELDS ];

        if ( data.required_fields && Array.isArray( data.required_fields ) && data.required_fields.length && data.required_fields.every( _.isString ) ) {
            required_fields.push( ...data.required_fields );
        } // add additional fields to returning

        let wObjects = await WObjectModel.aggregate( [
            { $match: findParams },
            { $sort: { weight: -1 } },
            { $skip: data.skip },
            { $limit: data.limit + 1 },
            {
                $addFields: {
                    'fields': {
                        $filter: {
                            input: '$fields',
                            as: 'field',
                            cond: {
                                $in: [ '$$field.name', required_fields ]
                            }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'wobjects',
                    localField: 'parent',
                    foreignField: 'author_permlink',
                    as: 'parent'
                }
            }
        ] );

        let hasMore = false;

        if ( !wObjects || wObjects.length === 0 ) {
            return { wObjectsData: [] };
        } else if ( wObjects.length === data.limit + 1 ) {
            hasMore = true;
            wObjects = wObjects.slice( 0, data.limit );
        }

        if( data.user_limit ) {
            await Promise.all( wObjects.map( async ( wobject ) => {
                wobject.users = await UserWobjectsModel.aggregate( [
                    { $match: { author_permlink: wobject.author_permlink } },
                    { $sort: { weight: -1 } },
                    { $limit: data.user_limit },
                    {
                        $project: {
                            _id: 0,
                            name: '$user_name',
                            weight: 1
                        }
                    }
                ] );
            } ) );
        } // assign top users to each of wobject

        wObjects.forEach( ( wObject ) => {
            wObject.users = wObject.users || [];
            wObject.user_count = wObject.users.length; // add field user count
            wObjectHelper.formatRequireFields( wObject, data.locale, required_fields.map( ( item ) => ( { name: item } ) ) );

            // format parent field
            if( Array.isArray( wObject.parent ) ) {
                if( _.isEmpty( wObject.parent ) ) {
                    wObject.parent = '';
                } else {
                    wObject.parent = wObject.parent[ 0 ];
                    getRequiredFields( wObject.parent, REQUIREFIELDS_PARENT );
                }
            }
        } );

        await rankHelper.calculateWobjectRank( wObjects ); // calculate rank for wobject

        return { wObjectsData: wObjects, hasMore };
    } catch ( error ) {
        return { error };
    }
};

const getFields = async function ( data ) {
    try {
        const wObject = await WObjectModel
            .findOne( { 'author_permlink': data.author_permlink } )
            .select( 'fields' )
            .lean();

        return { fieldsData: wObject ? _.orderBy( wObject.fields, [ 'weight' ], [ 'desc' ] ) : [] };
    } catch ( error ) {
        return { error };
    }
};

const getGalleryItems = async function ( data ) {
    try {
        const gallery = await WObjectModel.aggregate( [
            { $match: { author_permlink: data.author_permlink } },
            { $unwind: '$fields' },
            { $match: { $or: [ { 'fields.name': 'galleryItem' },
                { 'fields.name': 'galleryAlbum' } ] } },
            { $replaceRoot: { newRoot: '$fields' } },
            { $group: { _id: '$id', items: { $push: '$$ROOT' } } },
            { $replaceRoot: { newRoot: { $mergeObjects: [
                { $arrayElemAt: [ { $filter: { input: '$items', as: 'item', cond: { $eq: [ '$$item.name', 'galleryAlbum' ] } } }, 0 ] },
                { items: { $filter: { input: '$items', as: 'item', cond: { $eq: [ '$$item.name', 'galleryItem' ] } } } }
            ] } } }
        ] );
        const rootAlbum = { id: data.author_permlink, name: 'galleryAlbum', body: 'Photos', items: [] };

        for( const i in gallery ) {
            if ( !gallery[ i ].id ) {
                gallery[ i ] = { ...rootAlbum, ...gallery[ i ] };
                return { gallery };
            }
        }
        gallery.push( rootAlbum );
        return { gallery };
    } catch ( error ) {
        return { error };
    }
};

const getList = async function ( author_permlink ) {
    try {
        const fields = await WObjectModel.aggregate( [
            { $match: { author_permlink: author_permlink } },
            { $unwind: '$fields' },
            { $replaceRoot: { newRoot: '$fields' } },
            { $match: { $or: [ { name: 'listItem' }, { name: 'sortCustom' } ] } },
            {
                $lookup: {
                    from: 'wobjects',
                    localField: 'body',
                    foreignField: 'author_permlink',
                    as: 'wobject'
                }
            }
        ] );
        const sortCustomField = _.maxBy( fields.filter( ( field ) => field.name === 'sortCustom' ), 'weight' );
        const wobjects = _.compact( _.map( fields.filter( ( field ) => field.name === 'listItem' && !_.isEmpty( field.wobject ) ), ( field ) => {
            return { ...field.wobject[ 0 ], alias: field.alias };
        } ) );

        await rankHelper.calculateWobjectRank( wobjects );
        wobjects.forEach( ( wObject ) => {
            if ( wObject.object_type.toLowerCase() === 'list' ) {
                wObject.listItemsCount = wObject.fields.filter( ( f ) => f.name === 'listItem' ).length;
            }
            getRequiredFields( wObject, [ ...REQUIREDFIELDS ] );
        } );
        return { wobjects, sortCustom: JSON.parse( _.get( sortCustomField, 'body', '[]' ) ) };
    } catch ( error ) {
        return { error };
    }
};

const fromAggregation = async function( pipeline ) {
    try{
        const wobjects = await WObjectModel.aggregate( [ ...pipeline ] ) ;

        if( !wobjects || _.isEmpty( wobjects ) ) {
            return { error: { status: 404, message: 'Wobjects not found!' } };
        }
        return { wobjects };
    } catch ( error ) {
        return { error };
    }
};

const formatUsers = function ( wObject ) {
    rankHelper.calculateForUsers( wObject.users, wObject.weight ); // add rank in wobject for each user
    wObject.users = _.orderBy( wObject.users, [ 'weight' ], [ 'desc' ] ); // order users by rank
};

const getRequiredFields = function ( wObject, requiredFields ) {
    wObject.fields = wObject.fields.filter( ( item ) => requiredFields.includes( item.name ) );
};

const isFieldExist = async ( { author_permlink, fieldName } ) => {
    try {
        const wobj = await WObjectModel.findOne( { author_permlink, 'fields.name': fieldName } ).lean();

        return !!wobj;
    } catch ( error ) {
        return { error };
    }
};

module.exports = { getAll, getOne, search, getFields, getGalleryItems, getList, fromAggregation };
