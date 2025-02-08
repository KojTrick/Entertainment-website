function signup(){
    event.preventDefault();
    
    

    var email=document.getElementById('email').value;
    var username=document.getElementById('username').value;
    var pass=document.getElementById('password').value;
     var outcome= document.getElementById('outcome');
   
    var user={
        email: email,
        username: username,
        password: pass,
    };
    var json=JSON.stringify(user);
    localStorage.setItem(username,json);

    if (username==''||email==''||pass==''){
        outcome.innerHTML='There is an error,please try again';
    }
    else{
   
    outcome.innerHTML='Sign up successful! Proceed to log in';

    console.log('user added');
    console.log(user)
}
  
}


function loginFunc(){
    event.preventDefault();

    var username= document.getElementById('username').value;
    var pass= document.getElementById('password').value;
    var result= document.getElementById('result');

    var user = localStorage.getItem(username);
    var data = JSON.parse(user);
    console.log(data);
    if(user == null||username == ''){
        result.innerHTML= 'wrong username';
    }else if(username == data.username && pass == data.password){
        result.innerHTML = 'Welcome New user! logged in!';
    }else{
        result.innerHTML = 'wrong password';
    }

    }
