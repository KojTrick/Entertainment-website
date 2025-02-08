function signup(){
    event.preventDefault();
    
    

    var email=document.getElementById('email').value;
    var username=document.getElementById('username').value;
    var text=document.getElementById('textarea').value;
    var numb=document.getElementById('number').value;
     var outcome= document.getElementById('outcome');
   
    var user={
        username: username,
        email: email,
       number: numb,
       textarea: text,
    };
    var json=JSON.stringify(user);
    localStorage.setItem(username,json);

    if (username==''||email==''||numb==''){
        outcome.innerHTML='Information incomplete,please try again';
    }
    else if(text==''){
        outcome.innerHTML='You did not write any message'
    }
    
    else{
   
    outcome.innerHTML='Message received! Thank you for contacting us!';

    console.log('user added');
    console.log(user)
}
  
}


