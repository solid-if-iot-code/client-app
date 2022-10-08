window.onload = (event) => {
    const subscribed = document.querySelectorAll('.subscribed')
    for (const s of subscribed) {
        s.addEventListener('click', unsubscribe)
    }
    const unsubscribed = document.querySelectorAll('.unsubscribed')
    for (const s of unsubscribed) {
        s.addEventListener('click', subscribe)
    }
}

function unsubscribe(e) {
    console.log(e.target.id)
    console.log(e.target.value)
    const XHR = new XMLHttpRequest();
    let data = `topic=${encodeURIComponent(e.target.id)}&uri=${encodeURIComponent(e.target.value)}`
    XHR.open("POST", "/subscribe")
    XHR.addEventListener('error', (event) => {
        alert('Oops! Something went wrong.');
    });
    XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    XHR.send(data);
    XHR.onreadystatechange = () => {
        if (XHR.readyState === 4) {
            if (XHR.status === 200) {
            alert('Success!')
            window.location = '/home';
            } else {
            alert('Error! Something went wrong')
            window.location = '/error'
            }
        }
    }
}

function subscribe(e) {
    console.log(e.target.id)
    console.log(e.target.value)
    const XHR = new XMLHttpRequest();
    let data = `topic=${encodeURIComponent(e.target.id)}&uri=${encodeURIComponent(e.target.value)}`
    XHR.open("POST", "/unsubscribe")
    XHR.addEventListener('error', (event) => {
        alert('Oops! Something went wrong.');
    });
    XHR.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    XHR.send(data);
    XHR.onreadystatechange = () => {
        if (XHR.readyState === 4) {
            if (XHR.status === 200) {
            alert('Success!')
            window.location = '/home';
            } else {
            alert('Error! Something went wrong')
            window.location = '/error'
            }
        }
    }
}