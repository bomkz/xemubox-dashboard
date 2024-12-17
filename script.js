document.addEventListener('DOMContentLoaded', () => {
    const sendRequestButton = document.getElementById('sendRequestButton');
    const toggleDarkModeButton = document.getElementById('toggleDarkMode');
    const gridContainer = document.getElementById('gridContainer');

    sendRequestButton.addEventListener('click', () => {
        fetch('127.0.0.1:9547', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            console.log('Request sent:', data);
        })
        .catch(error => {
            console.error('Error sending request:', error);
        });
    });

    toggleDarkModeButton.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });

    fetch('127.0.0.1:9547/api/games')
        .then(response => response.json())
        .then(items => {
            items.forEach(item => {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';

                const img = document.createElement('img');
                img.src = item.imageUrl;
                img.alt = item.name;

                const name = document.createElement('p');
                name.textContent = item.name
