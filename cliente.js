function iniciar(){
  firebase.auth().signInAnonymously();
}

var firebaseUID = "";
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    var isAnonymous = user.isAnonymous;
    firebaseUID = user.uid;
  } else {
    firebase.auth().signInAnonymously();
  }
});

function gestorOrientacion(){
  alert(window.screen.orientation.angle);
}
