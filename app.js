const express = require( 'express' );
const morgan = require( 'morgan' );
const cors = require( 'cors' );
const bodyParser = require( 'body-parser' );
const { routes } = require( './routes' );
const { moderateWobjects } = require( './utilities/operations/moderation' );
const { createNamespace } = require( 'cls-hooked' );
const session = createNamespace( 'request-session' );

const app = express();

app.use( ( req, res, next ) => session.run( () => next() ) );
app.use( cors() );
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( morgan( 'dev' ) );
// write to store user steemconnect access_token if it exist
app.use( ( req, res, next ) => {
    session.set( 'access_token', req.headers.access_token );
    next();
} );
app.use( '/', routes );

// Moderate wobjects depend on app moderators before send
app.use( '/', moderateWobjects.moderate );

// Last middleware which send data from "res.result.json" to client
app.use( ( req, res, next ) => {
    res.status( res.result.status || 200 ).json( res.result.json );
} );

// error handler
app.use( ( err, req, res, next ) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get( 'env' ) === 'development' ? err : {};
    // render the error page
    res.status( err.status || 500 ).json( { message: err.message } );
} );

module.exports = app;
