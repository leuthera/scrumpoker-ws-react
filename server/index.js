const express = require('express');
const socketio = require('socket.io');
const http = require('http');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const PORT = process.env.PORT || 5000;

const router = require('./router');

const app = express();
app.use(router);

const server = http.createServer( app );
const io = socketio( server )

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

io.on('connection', socket => {
    console.log('We have a connection.');

    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, name, room });

        if ( error ) {
            callback( error );
            return;
        }
        socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room ${user.room}` });
        socket.broadcast.to( user.room ).emit( 'message', { user: 'admin', text: `${user.name}, has joined!` });

        socket.join( user.room );

        io.to( user.room ).emit('roomData', { room: user.room, users: getUsersInRoom( user.room ) } );

        callback();
    });

    socket.on('sendMessage', ( message, callback ) => {
        const user = getUser( socket.id );
        io.to( user.room ).emit('message', { user: user.name, text: message } );
        io.to( user.room ).emit('roomData', { room: user.room, users: getUsersInRoom( user.room ) } );
        callback();
    });

    socket.on('picked', number => {
        const user = getUser( socket.id );
        io.to( 'ksb' ).emit('cardPicked', { user: user.name, pick: number.selected } );
    });

    socket.on('showCards', show => io.to( 'ksb' ).emit('showCards', show ) );

    socket.on('disconnect', () => {
        const user = removeUser( socket.id );
        if ( user ) {
            io.to( user.room ).emit('message', { user: 'admin', text: `${ user.name } has left.`})
            io.to( user.room ).emit('roomData', { room: user.room, users: getUsersInRoom( user.room ) } );
        }
    });
});
