// Check if user is already logged in
function checkAuthState() {
  firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
          // User is signed in
          console.log("User is signed in:", user.email);
      } else {
          // No user is signed in
          console.log("No user is signed in");
      }
  });
}

// Login with Google
async function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        
        // Check if user exists in database
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            // Check if user is admin
            if (userDoc.data().isAdmin) {
                window.location.href = 'dashboardadmin.html';
            } else {
                window.location.href = 'loginsuccess.html';
            }
        } else {
            // New user, redirect to register.html
            window.location.href = 'register.html';
        }
        
        return user;
    } catch (error) {
        console.error("Error during Google login:", error);
        throw error;
    }
}

// Check if user has completed registration
async function checkUserRegistration(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();
        
        if (userDoc.exists) {
            // Check if user is admin
            if (userDoc.data().isAdmin) {
                window.location.href = 'dashboardadmin.html';
            } else {
                window.location.href = 'loginsuccess.html';
            }
        } else {
            // User has not completed registration
            window.location.href = 'register.html';
        }
    } catch (error) {
        console.error("Error checking user registration:", error);
        throw error;
    }
}

// Register new user
async function registerUser(userData) {
  try {
      await firebase.firestore().collection('users').doc(userData.uid).set(userData);
      return true;
  } catch (error) {
      console.error("Error registering user:", error);
      throw error;
  }
}

// Logout user
async function logoutUser() {
  try {
      await firebase.auth().signOut();
      window.location.href = 'index.html';
  } catch (error) {
      console.error("Error logging out:", error);
      throw error;
  }
}

// Check if user is admin
async function checkIfUserIsAdmin(userId) {
  try {
      const userDoc = await firebase.firestore().collection('users').doc(userId).get();
      
      if (userDoc.exists && userDoc.data().isAdmin) {
          return true;
      }
      
      return false;
  } catch (error) {
      console.error("Error checking if user is admin:", error);
      return false;
  }
}

// Initialize auth state
document.addEventListener('DOMContentLoaded', function() {
  checkAuthState();
});