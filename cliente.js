var firebaseUID = "";

function iniciar(){
  
  firebase.initializeApp(firebaseConfig);
  //var database = firebase.database();
  firebase.auth().signInAnonymously();
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      var isAnonymous = user.isAnonymous;
      firebaseUID = user.uid;
    } else {
      firebase.auth().signInAnonymously();
    }
  });
}

function gestorOrientacion(){
  alert(window.screen.orientation.angle);
}
