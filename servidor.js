"use strict";
/* globals M, firebase */

function backEnd(funcion,param,back){
  var usuarioRef,jugadorRef;
  var database = firebase.database();
  var userId = firebase.auth().currentUser.uid;
  switch(funcion){
    case "nvoJugador":
      jugadorRef = database.ref('jugadores/' + param.codigo);
      jugadorRef.once('value').then(function(snapshot){
        var datos = snapshot.val();
        if (datos){
          if (datos.propietario === ""){
            datos.propietario = userId;
            datos.nacimiento = Date.now();
            jugadorRef.set(datos, function(error) {
              if (error) {
                back(false);
              } else {
                var usuarioRef = database.ref('usuarios/' + userId);
                usuarioRef.once('value').then(function(snapshot){
                  var datos = snapshot.val();
                  if (datos){
                    if (!datos.jugadores){
                      datos.jugadores = [];
                    }
                    if (datos.jugadores.indexOf(param)<0){
                      datos.jugadores.push(param.codigo);
                      usuarioRef.set(datos, function(error) {
                        if (error) {
                          back(false);
                        } else {
                          back(true);
                        }
                      });
                    } else {
                      back(false);
                    }
                  } else {
                    back(false);
                  }
                });
              }
            });
          } else {
            back(false);
          }
        } else {
          back(false);
        }
      });
      break;
    case "misDatos":
      usuarioRef = database.ref('usuarios/' + userId);
      usuarioRef.once('value').then(function(snapshot){
        var datos = snapshot.val();
        if (datos){
          back(datos);
        } else {
          datos = {
            nombre: userId,
            arquero: "0",
            defensa: ["0","0","0","0"],
            medio: ["0","0","0"],
            ataque: ["0","0","0"],
            jugados: 0,
            ganados: 0,
            empatados: 0,
            nivel: 0,
            jugadores: [],
          };
          usuarioRef.set(datos, function(error) {
            if (error) {
              back(null);
            } else {
              back(datos);
            }
          });
        }
      });
      break;
    case "setPosicion":
      jugadorRef = database.ref('jugadores/' + param.jugador);
      jugadorRef.once('value').then(function(snapshot){
        var datos = snapshot.val();
        if (datos){
          if (datos.propietario === userId){
            datos.posicion = param.posicion;
            jugadorRef.set(datos, function(error) {
              if (error) {
                back(false);
              } else {
                back(true);
              }
            });
          } else {
            back(false);
          }
        } else {
          back(false);
        }
      });
      break;
    case "setEquipo":
      usuarioRef = database.ref('usuarios/' + userId);
      usuarioRef.once('value').then(function(snapshot){
        function validar(){
          function jugadorInvalido(codJugador){
            //valida que sea mi jugador y no este en el equipo dos veces.
            if (codJugador !== "0"){
              if (datos.jugadores.indexOf(codJugador) >= 0){//es mi jugador
                if (equipo.indexOf(codJugador) < 0){ //no esta en el equipo, todavia
                  equipo.push(codJugador);
                  return false;
                }
              }
              return true;
            }
            return false;//es suplente
          }

          var equipo = [];

          //arquero;
          if (jugadorInvalido(param.arquero)){
            return false;
          }

          //defensa
          var lng = param.defensa.length;
          var lngt = lng;
          if (lng<2 || lng>4){
            return false;
          }
          var i;
          for(i=0;i<lng;i++){
            if (jugadorInvalido(param.defensa[i])){
              return false;
            }
          }

          //medio
          lng = param.medio.length;
          lngt += lng;
          if (lng<2 || lng>4){
            return false;
          }
          for(i=0;i<lng;i++){
            if (jugadorInvalido(param.medio[i])){
              return false;
            }
          }

          //ataque
          lng = param.ataque.length;
          lngt += lng;
          if (lng<2 || lng>4){
            return false;
          }
          if (lngt>10){
            return false;
          }
          for(i=0;i<lng;i++){
            if (jugadorInvalido(param.ataque[i])){
              return false;
            }
          }
          return true;
        }
        var datos = snapshot.val();
        if (datos){
          if (validar()){
            datos.arquero = param.arquero;
            datos.defensa = param.defensa.slice();
            datos.medio = param.medio.slice();
            datos.ataque = param.ataque.slice();
            usuarioRef.set(datos, function(error) {
              if (error) {
                back(false);
              } else {
                back(true);
              }
            });
          } else {
            back(false);
          }
        } else {
          back(false);
        }
      });
      break;
    case 'nvoNombre':
      usuarioRef = database.ref('usuarios/' + userId);
      usuarioRef.once('value').then(function(snapshot){
        var datos = snapshot.val();
        if (datos.nombre !== param.nombre){
          var ref = firebase.database().ref("usuarios");
          ref.orderByChild("nombre").equalTo(param.nombre).once("value", function(snapshot) {
            var otros = snapshot.val();
            if (otros === null){
              datos.nombre = param.nombre;
              usuarioRef.set(datos, function(error) {
                back(datos);
              });
            }
          });
        } else {
          back(datos);
        }
      });
      break;
    case 'buscarOponente':
      usuarioRef = database.ref('usuarios/' + userId);
      usuarioRef.once('value').then(function(snapshot){
        var refMatch = firebase.database().ref("matchs");
        refMatch.orderByChild("visitante").equalTo("").once("value", function(snapshot) {
          var match = snapshot.val();
          if (match === null){ //no hay desafio, creo uno
            var llave = refMatch.push({
              local:userId,
              visitante: "",
            });
            back(llave.key);
          } else {//acepto el desafio
            snapshot.forEach(function(childSnapshot) {
              var key = childSnapshot.key;
              var equipos = childSnapshot.val();
              equipos.visitante = userId;
              database.ref('matchs/' + key).set(equipos,function(error) {
                if (error) {
                  back(null);
                } else {
                  back(key);
                }
              });
            });
          }
        });
      });
      break;
      case 'noJugar':
      usuarioRef = database.ref('usuarios/' + userId);
      usuarioRef.once('value').then(function(snapshot){
        var refMatch = firebase.database().ref("matchs");
        refMatch.orderByChild("visitante").equalTo(userId).once("value", function(snapshot) {
          snapshot.forEach(function(childSnapshot) {
            var key = childSnapshot.key;
            database.ref('matchs/' + key).remove();
          });
        });
        refMatch.orderByChild("local").equalTo(userId).once("value", function(snapshot) {
          snapshot.forEach(function(childSnapshot) {
            var key = childSnapshot.key;
            database.ref('matchs/' + key).remove();
          });
        });
      });
      break;
  }
}
