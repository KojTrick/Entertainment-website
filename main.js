/* Contact form and login (data is saved only in this browser's localStorage). */
(function () {
    function save(key, val) { try { localStorage.setItem(key, val); return true; } catch (e) { return false; } }
    function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
    function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

    window.signup = function (ev) {
        if (ev) ev.preventDefault();
        var out = document.getElementById('outcome');
        var user = { username: val('username'), email: val('email'), number: val('number'), textarea: val('textarea') };
        if (!user.username || !user.email || !user.number) { out.textContent = 'Information incomplete, please try again'; return; }
        if (!user.textarea) { out.textContent = 'You did not write any message'; return; }
        save('kpe:user:' + user.username, JSON.stringify(user));
        out.textContent = 'Message received! Thank you for contacting us!';
    };

    window.loginFunc = function (ev) {
        if (ev) ev.preventDefault();
        var out = document.getElementById('result');
        var name = val('username');
        if (!name || !document.getElementById('password').value) { out.textContent = 'Please enter your username and password.'; return; }
        out.textContent = load('kpe:user:' + name)
            ? 'Welcome back, ' + name + '!'
            : 'No account found for that username. Use the contact page to sign up.';
    };

    var c = document.getElementById('contactForm'), l = document.getElementById('loginForm');
    if (c) c.addEventListener('submit', window.signup);
    if (l) l.addEventListener('submit', window.loginFunc);
})();
