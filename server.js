'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.misDatos = functions.https.onCall((data, context) => {
    if (!context.auth) {
        return null;
    }
    const userId = context.auth.uid;
    var database = admin.database();
    var usuarioRef = database.ref('usuarios/' + userId);
    return usuarioRef.once('value').then(function(snapshot){
        var datos = snapshot.val();
        if (!datos){
            datos = {
                nombre: userId,
                arquero: "0",
                defensa: ["0","0","0","0"],
                medio: ["0","0","0"],
                ataque: ["0","0","0"],
                perdidos: 0,
                ganados: 0,
                empatados: 0,
                nivel: 0,
                jugadores: [],
                favor: 0,
                contra: 0,
            };
            usuarioRef.set(datos);
        }
        return datos;
    });
});

