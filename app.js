document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const userForm = document.getElementById('userForm');
    const userList = document.getElementById('userList');
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const logoutButton = document.getElementById('logoutButton');

    let isEditing = false;
    let editingUserId = null;
    let token = localStorage.getItem('token');

    function toggleSections() {
        if (token) {
            authSection.style.display = 'none';
            userSection.style.display = 'block';
            loadUsers();
        } else {
            authSection.style.display = 'block';
            userSection.style.display = 'none';
        }
    }

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const username = loginForm.username.value.trim();
        const password = loginForm.password.value.trim();

        if (!username || !password) {
            alert('Username and password are required.');
            return;
        }

        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                token = data.token;
                localStorage.setItem('token', token);
                toggleSections();
            } else {
                alert('Invalid username or password.');
            }
        });
    });

    userForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const name = userForm.name.value.trim();
        const favoriteMovie = userForm.favoriteMovie.value.trim();
        const favoriteSeries = userForm.favoriteSeries.value.trim();
        const favoriteGame = userForm.favoriteGame.value.trim();
        const favoriteComic = userForm.favoriteComic.value.trim();

        if (!name || !favoriteMovie || !favoriteSeries || !favoriteGame || !favoriteComic) {
            alert('Todos os campos são obrigatórios.');
            return;
        }

        const userData = {
            name,
            favoriteMovie,
            favoriteSeries,
            favoriteGame,
            favoriteComic
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': token
        };

        if (isEditing) {
            userData.id = editingUserId;
            fetch(`/update-user/${editingUserId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(userData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateUserInList(data.user);
                    userForm.reset();
                    isEditing = false;
                    editingUserId = null;
                } else {
                    alert('Erro ao atualizar usuário.');
                }
            });
        } else {
            fetch('/add-user', {
                method: 'POST',
                headers,
                body: JSON.stringify(userData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addUserToList(data.user);
                    userForm.reset();
                } else {
                    alert('Erro ao adicionar usuário.');
                }
            });
        }
    });

    logoutButton.addEventListener('click', function () {
        token = null;
        localStorage.removeItem('token');
        toggleSections();
    });

    function addUserToList(user) {
        const li = document.createElement('li');
        li.dataset.userId = user.id;
        li.innerHTML = `${user.name} - Filme: ${user.favoriteMovie}, Série: ${user.favoriteSeries}, Jogo: ${user.favoriteGame}, Quadrinho: ${user.favoriteComic}
                        <button onclick="editUser(${user.id})">Editar</button>
                        <button onclick="deleteUser(${user.id})">Excluir</button>`;
        userList.appendChild(li);
    }

    function updateUserInList(user) {
        const li = document.querySelector(`li[data-user-id='${user.id}']`);
        li.innerHTML = `${user.name} - Filme: ${user.favoriteMovie}, Série: ${user.favoriteSeries}, Jogo: ${user.favoriteGame}, Quadrinho: ${user.favoriteComic}
                        <button onclick="editUser(${user.id})">Editar</button>
                        <button onclick="deleteUser(${user.id})">Excluir</button>`;
    }

    window.editUser = function(userId) {
        const li = document.querySelector(`li[data-user-id='${userId}']`);
        const [name, favoriteMovie, favoriteSeries, favoriteGame, favoriteComic] = li.textContent.split(' - ').map(item => item.split(': ')[1]);
        
        userForm.name.value = name;
        userForm.favoriteMovie.value = favoriteMovie;
        userForm.favoriteSeries.value = favoriteSeries;
        userForm.favoriteGame.value = favoriteGame;
        userForm.favoriteComic.value = favoriteComic;

        isEditing = true;
        editingUserId = userId;
    }

    window.deleteUser = function(userId) {
        const headers = {
            'Authorization': token
        };

        fetch(`/delete-user/${userId}`, {
            method: 'DELETE',
            headers
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const li = document.querySelector(`li[data-user-id='${userId}']`);
                userList.removeChild(li);
            } else {
                alert('Erro ao excluir usuário.');
            }
        });
    }

    function loadUsers() {
        const headers = {
            'Authorization': token
        };

        fetch('/users', { headers })
            .then(response => response.json())
            .then(data => {
                userList.innerHTML = '';
                data.users.forEach(user => addUserToList(user));
            });
    }

    toggleSections();
});
