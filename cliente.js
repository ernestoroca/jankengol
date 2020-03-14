function iniciar(){
  var firebaseConfig = {
        apiKey: "AIzaSyAE0BFC11pL8LAsmzfKojGAkxiwt5-sbBo",
        authDomain: "jankengol.firebaseapp.com",
        databaseURL: "https://jankengol.firebaseio.com",
        projectId: "jankengol",
        storageBucket: "jankengol.appspot.com",
        messagingSenderId: "225043875998",
        appId: "1:225043875998:web:d204d20da25101fe5e538f"
  };
  firebase.initializeApp(firebaseConfig);
  //var database = firebase.database();
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
