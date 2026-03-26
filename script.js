// ========== إعدادات الأدمن ==========
const ADMIN_EMAILS = ['jasim28v@gmail.com'];
let isAdmin = false;

// ========== المتغيرات العامة ==========
let currentUser = null;
let currentUserData = null;
let allUsers = {};
let allPosts = [];
let allStories = [];
let currentChatUserId = null;
let selectedPostMedia = null;
let selectedMediaType = null;

// ========== دوال المصادقة ==========
function switchAuth(type) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(type + 'Form').classList.add('active');
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMsg');
    if (!email || !password) { msg.innerText = 'الرجاء ملء جميع الحقول'; return; }
    msg.innerText = 'جاري تسجيل الدخول...';
    try {
        await auth.signInWithEmailAndPassword(email, password);
        msg.innerText = '';
    } catch (error) {
        if (error.code === 'auth/user-not-found') msg.innerText = 'لا يوجد حساب بهذا البريد';
        else if (error.code === 'auth/wrong-password') msg.innerText = 'كلمة المرور غير صحيحة';
        else msg.innerText = 'حدث خطأ: ' + error.message;
    }
}

async function register() {
    const username = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPass').value;
    const msg = document.getElementById('regMsg');
    if (!username || !email || !password) { msg.innerText = 'املأ جميع الحقول'; return; }
    if (password.length < 6) { msg.innerText = 'كلمة المرور 6 أحرف على الأقل'; return; }
    msg.innerText = 'جاري إنشاء الحساب...';
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref(`users/${userCredential.user.uid}`).set({
            username, email, bio: '', avatarUrl: '', followers: {}, following: {}, createdAt: Date.now()
        });
        msg.innerText = '';
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') msg.innerText = 'البريد الإلكتروني مستخدم بالفعل';
        else msg.innerText = 'حدث خطأ: ' + error.message;
    }
}

function logout() { auth.signOut(); location.reload(); }

// ========== التحقق من الأدمن ==========
function checkAdminStatus() {
    if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
        isAdmin = true;
        console.log('✅ Admin mode activated');
        return true;
    }
    isAdmin = false;
    return false;
}

// ========== دوال الأدمن ==========
async function renderAdminPanel() {
    if (!isAdmin) return '';
    const usersSnap = await db.ref('users').once('value');
    const users = usersSnap.val() || {};
    const postsSnap = await db.ref('posts').once('value');
    const posts = postsSnap.val() || {};
    const totalLikes = Object.values(posts).reduce((sum, p) => sum + (p.likes || 0), 0);
    const bannedUsers = Object.values(users).filter(u => u.banned).length;
    return `
        <div class="admin-panel-section">
            <h3 style="color:#ec489a;font-weight:bold;margin-bottom:16px;"><i class="fas fa-shield-alt"></i> لوحة التحكم</h3>
            <div class="admin-stats">
                <div class="admin-stat-card"><div class="admin-stat-number">${Object.keys(users).length}</div><div>مستخدمين</div></div>
                <div class="admin-stat-card"><div class="admin-stat-number">${Object.keys(posts).length}</div><div>منشورات</div></div>
                <div class="admin-stat-card"><div class="admin-stat-number">${totalLikes}</div><div>إجمالي الإعجابات</div></div>
                <div class="admin-stat-card"><div class="admin-stat-number">${bannedUsers}</div><div>محظورين</div></div>
            </div>
            <div><h4 class="font-bold mb-2">🗑️ حذف منشورات</h4><div class="admin-list">${Object.entries(posts).reverse().slice(0, 15).map(([id, p]) => `
                <div class="admin-item"><div>${p.caption?.substring(0, 35) || 'منشور'}</div><button class="admin-delete-btn" onclick="adminDeletePost('${id}')">حذف</button></div>
            `).join('')}</div></div>
            <div class="mt-4"><h4 class="font-bold mb-2">👥 إدارة المستخدمين</h4><div class="admin-list">${Object.entries(users).slice(0, 15).map(([uid, u]) => `
                <div class="admin-item"><div>@${u.username}</div><div>${!u.banned ? `<button class="admin-ban-btn" onclick="adminBanUser('${uid}')">حظر</button>` : `<button class="admin-ban-btn" style="background:rgba(76,175,80,0.2);color:#4caf50" onclick="adminUnbanUser('${uid}')">إلغاء الحظر</button>`}<button class="admin-delete-btn" onclick="adminDeleteUser('${uid}')">حذف</button></div></div>
            `).join('')}</div></div>
        </div>
    `;
}
async function adminDeletePost(postId) { if (!isAdmin) return; if (confirm('حذف المنشور؟')) { await db.ref(`posts/${postId}`).remove(); alert('✅ تم الحذف'); location.reload(); } }
async function adminBanUser(userId) { if (!isAdmin) return; if (confirm('حظر المستخدم؟')) { await db.ref(`users/${userId}/banned`).set(true); alert('✅ تم الحظر'); location.reload(); } }
async function adminUnbanUser(userId) { if (!isAdmin) return; if (confirm('إلغاء الحظر؟')) { await db.ref(`users/${userId}/banned`).remove(); alert('✅ تم إلغاء الحظر'); location.reload(); } }
async function adminDeleteUser(userId) { if (!isAdmin) return; if (confirm('حذف المستخدم وجميع منشوراته؟')) { const postsSnap = await db.ref('posts').once('value'); const posts = postsSnap.val() || {}; Object.entries(posts).forEach(([id, p]) => { if (p.sender === userId) db.ref(`posts/${id}`).remove(); }); await db.ref(`users/${userId}`).remove(); alert('✅ تم الحذف'); location.reload(); } }

// ========== تحميل البيانات ==========
async function loadUserData() {
    const snap = await db.ref(`users/${currentUser.uid}`).get();
    if (snap.exists()) currentUserData = { uid: currentUser.uid, ...snap.val() };
}
db.ref('users').on('value', s => { allUsers = s.val() || {}; });

// ========== هاشتاقات ==========
function addHashtags(text) {
    if (!text) return '';
    return text.replace(/#(\w+)/g, '<span class="hashtag" onclick="searchHashtag(\'$1\')">#$1</span>');
}
function searchHashtag(tag) { document.getElementById('searchInput').value = '#' + tag; openSearch(); searchAll(); }

// ========== عرض المنشورات (جميع المنشورات، بدون تصفية) ==========
db.ref('posts').on('value', (s) => {
    const data = s.val();
    if (!data) { allPosts = []; renderFeed(); return; }
    allPosts = [];
    Object.keys(data).forEach(key => allPosts.push({ id: key, ...data[key] }));
    allPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    renderFeed();
});

function renderFeed() {
    const container = document.getElementById('feedContainer');
    if (!container) return;
    container.innerHTML = '';
    if (allPosts.length === 0) { container.innerHTML = '<div class="loading">✨ لا توجد منشورات بعد</div>'; return; }
    // عرض جميع المنشورات لجميع المستخدمين (لا نستخدم تصفية)
    allPosts.forEach(post => {
        const user = allUsers[post.sender] || { username: post.senderName || 'user', avatarUrl: '' };
        const isLiked = post.likedBy && post.likedBy[currentUser?.uid];
        const isFollowing = currentUserData?.following && currentUserData.following[post.sender];
        const mediaHtml = post.mediaType === 'video' 
            ? `<div class="media-container"><video class="post-media" controls><source src="${post.mediaUrl}" type="video/mp4"></video><div class="video-watermark"><i class="fas fa-heart"></i> instagrami</div></div>`
            : `<img class="post-media" src="${post.mediaUrl}" alt="post">`;
        const caption = addHashtags(post.caption || '');
        const commentsCount = post.comments ? Object.keys(post.comments).length : 0;
        const div = document.createElement('div');
        div.className = 'post-card';
        div.innerHTML = `
            <div class="post-header">
                <div class="post-avatar" onclick="viewProfile('${post.sender}')">${user.avatarUrl ? `<img src="${user.avatarUrl}">` : (user.username?.charAt(0) || '👤')}</div>
                <div class="post-user" onclick="viewProfile('${post.sender}')">@${user.username}</div>
                ${currentUser?.uid !== post.sender ? `<button class="follow-small" onclick="toggleFollowProfile('${post.sender}', this)">${isFollowing ? 'متابع' : 'متابعة'}</button>` : ''}
            </div>
            ${mediaHtml}
            <div class="post-actions">
                <button class="action-btn like-btn ${isLiked ? 'active' : ''}" onclick="toggleLikePost('${post.id}', this)"><i class="fas fa-heart"></i><span>${post.likes || 0}</span></button>
                <button class="action-btn" onclick="openCommentsPost('${post.id}')"><i class="fas fa-comment"></i><span>${commentsCount}</span></button>
                <button class="action-btn" onclick="sharePost('${post.mediaUrl}')"><i class="fas fa-paper-plane"></i></button>
            </div>
            <div class="post-caption">${caption}<div class="post-time">${new Date(post.timestamp).toLocaleString()}</div></div>
        `;
        container.appendChild(div);
    });
}

// ========== الإعجاب ==========
async function toggleLikePost(postId, btn) {
    if (!currentUser) return;
    const postRef = db.ref(`posts/${postId}`);
    const snap = await postRef.get();
    const post = snap.val();
    let likes = post.likes || 0;
    let likedBy = post.likedBy || {};
    if (likedBy[currentUser.uid]) {
        likes--; delete likedBy[currentUser.uid];
    } else {
        likes++; likedBy[currentUser.uid] = true;
        await addNotification(post.sender, 'like', currentUser.uid);
    }
    await postRef.update({ likes, likedBy });
    btn.classList.toggle('active');
    btn.querySelector('span').innerText = likes;
}

// ========== التعليقات ==========
async function openCommentsPost(postId) {
    const comment = prompt("أضف تعليقاً:");
    if (comment && comment.trim()) {
        await db.ref(`posts/${postId}/comments`).push({
            userId: currentUser.uid,
            username: currentUserData?.username,
            text: comment,
            timestamp: Date.now()
        });
        const post = allPosts.find(p => p.id === postId);
        if (post && post.sender !== currentUser.uid) await addNotification(post.sender, 'comment', currentUser.uid);
        renderFeed();
    }
}

function sharePost(url) {
    if (navigator.share) navigator.share({ url });
    else { navigator.clipboard.writeText(url); alert('✅ تم نسخ الرابط'); }
}

// ========== القصص ==========
db.ref('stories').on('value', async (s) => {
    const data = s.val();
    const now = Date.now();
    const activeStories = [];
    if (data) {
        Object.keys(data).forEach(key => {
            const story = data[key];
            if (story.timestamp && (now - story.timestamp) < 24*60*60*1000) activeStories.push({ id: key, ...story });
        });
    }
    renderStories(activeStories);
});
function renderStories(stories) {
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    container.innerHTML = '';
    if (stories.length === 0) { container.innerHTML = '<div class="text-gray-500 text-sm p-4">لا توجد قصص جديدة</div>'; return; }
    stories.forEach(story => {
        const user = allUsers[story.sender] || { username: 'user', avatarUrl: '' };
        const div = document.createElement('div');
        div.className = 'story-item';
        div.onclick = () => window.open(story.mediaUrl, '_blank');
        div.innerHTML = `
            <div class="story-ring"><img class="story-avatar" src="${user.avatarUrl || 'https://via.placeholder.com/70'}" onerror="this.src='https://via.placeholder.com/70'"></div>
            <div class="story-name">${user.username}</div>
        `;
        container.appendChild(div);
    });
}

// ========== إضافة منشور ==========
function openCreatePost() { document.getElementById('createPostPanel').classList.add('open'); }
function closeCreatePost() { document.getElementById('createPostPanel').classList.remove('open'); resetPostForm(); }
function resetPostForm() { selectedPostMedia = null; document.getElementById('postPreview').style.display = 'none'; document.getElementById('postCaption').value = ''; document.getElementById('postFileInput').value = ''; document.getElementById('postStatus').innerHTML = ''; }
function previewPostMedia(input) {
    const file = input.files[0];
    if (!file) return;
    selectedPostMedia = file;
    selectedMediaType = file.type.startsWith('video/') ? 'video' : 'image';
    const reader = new FileReader();
    reader.onload = e => {
        const previewDiv = document.getElementById('postPreview');
        const previewVideo = document.getElementById('previewVideo');
        const previewImage = document.getElementById('previewImage');
        if (selectedMediaType === 'video') {
            previewVideo.src = e.target.result;
            previewVideo.style.display = 'block';
            previewImage.style.display = 'none';
        } else {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
            previewVideo.style.display = 'none';
        }
        previewDiv.style.display = 'block';
    };
    reader.readAsDataURL(file);
}
async function uploadPost() {
    if (!selectedPostMedia) { alert('اختر صورة أو فيديو'); return; }
    const caption = document.getElementById('postCaption').value;
    const statusDiv = document.getElementById('postStatus');
    statusDiv.innerHTML = '📤 جاري الرفع...';
    const fd = new FormData();
    fd.append('file', selectedPostMedia);
    fd.append('upload_preset', UPLOAD_PRESET);
    const resourceType = selectedMediaType === 'video' ? 'video' : 'image';
    fd.append('resource_type', resourceType);
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        await db.ref('posts').push({
            mediaUrl: data.secure_url,
            mediaType: resourceType,
            caption: caption,
            sender: currentUser.uid,
            senderName: currentUserData?.username,
            likes: 0,
            likedBy: {},
            comments: {},
            timestamp: Date.now()
        });
        statusDiv.innerHTML = '✅ تم النشر!';
        setTimeout(() => { closeCreatePost(); renderFeed(); }, 1500);
    } catch (error) { statusDiv.innerHTML = '❌ فشل النشر: ' + error.message; }
}

// ========== البحث ==========
function openSearch() { document.getElementById('searchPanel').classList.add('open'); }
function closeSearch() { document.getElementById('searchPanel').classList.remove('open'); }
function searchAll() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    if (!query) { resultsDiv.innerHTML = ''; return; }
    const users = Object.values(allUsers).filter(u => u.username.toLowerCase().includes(query));
    const posts = allPosts.filter(p => p.caption?.toLowerCase().includes(query));
    const hashtags = [...new Set(allPosts.flatMap(p => (p.caption?.match(/#\w+/g) || []).filter(h => h.toLowerCase().includes(query))))];
    resultsDiv.innerHTML = `
        ${users.length ? `<h4 class="font-bold mb-3 text-pink-400">👥 مستخدمين</h4>${users.map(u => `<div class="flex items-center gap-3 p-3 border-b border-gray-800" onclick="viewProfile('${u.uid}')"><div class="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 flex items-center justify-center">${u.avatarUrl ? `<img src="${u.avatarUrl}" class="w-full h-full rounded-full object-cover">` : (u.username.charAt(0))}</div><div><div class="font-bold">@${u.username}</div><div class="text-xs text-gray-500">${u.bio?.substring(0, 40) || ''}</div></div></div>`).join('')}` : ''}
        ${hashtags.length ? `<h4 class="font-bold mb-3 mt-4 text-cyan-400"># هاشتاقات</h4>${hashtags.map(h => `<div class="p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-900" onclick="searchHashtag('${h.substring(1)}')">${h}</div>`).join('')}` : ''}
        ${posts.length ? `<h4 class="font-bold mb-3 mt-4 text-pink-400">📷 منشورات</h4>${posts.map(p => `<div class="flex items-center gap-3 p-3 border-b border-gray-800 cursor-pointer" onclick="window.open('${p.mediaUrl}','_blank')"><img src="${p.mediaUrl}" class="w-12 h-12 object-cover rounded-lg">${p.caption?.substring(0, 40)}</div>`).join('')}` : ''}
    `;
}

// ========== الملف الشخصي ==========
async function viewProfile(userId) {
    if (!userId) return;
    await loadProfileData(userId);
    document.getElementById('profilePanel').classList.add('open');
}
async function loadProfileData(userId) {
    const userSnap = await db.ref(`users/${userId}`).get();
    const user = userSnap.val();
    if (!user) return;
    document.getElementById('profileAvatarDisplay').innerHTML = user.avatarUrl ? `<img src="${user.avatarUrl}">` : (user.username?.charAt(0) || '👤');
    document.getElementById('profileNameDisplay').innerText = user.username;
    document.getElementById('profileBioDisplay').innerText = user.bio || '';
    const userPosts = allPosts.filter(p => p.sender === userId);
    document.getElementById('profilePosts').innerText = userPosts.length;
    document.getElementById('profileFollowers').innerText = Object.keys(user.followers || {}).length;
    document.getElementById('profileFollowing').innerText = Object.keys(user.following || {}).length;
    const grid = document.getElementById('profilePostsGrid');
    grid.innerHTML = userPosts.map(p => `<div class="post-thumb" onclick="window.open('${p.mediaUrl}','_blank')"><i class="fas fa-${p.mediaType === 'video' ? 'video' : 'image'} text-2xl text-gray-500"></i></div>`).join('');
    const actions = document.getElementById('profileActions');
    actions.innerHTML = '';
    if (userId === currentUser?.uid) {
        actions.innerHTML = `<button class="bg-gradient-to-r from-pink-500 to-cyan-500 text-white px-6 py-2 rounded-full" onclick="openEditProfile()">تعديل الملف</button><button class="border border-gray-600 px-6 py-2 rounded-full ml-2" onclick="logout()">تسجيل خروج</button>`;
        if (isAdmin) {
            const adminPanel = await renderAdminPanel();
            actions.innerHTML += adminPanel;
        }
    } else {
        const isFollowing = currentUserData?.following && currentUserData.following[userId];
        actions.innerHTML = `<button class="bg-gradient-to-r from-pink-500 to-cyan-500 text-white px-6 py-2 rounded-full" onclick="toggleFollowProfile('${userId}', this)">${isFollowing ? 'متابع' : 'متابعة'}</button>`;
    }
}
function openMyProfile() { if (currentUser) viewProfile(currentUser.uid); }
function closeProfile() { document.getElementById('profilePanel').classList.remove('open'); }
function openEditProfile() { document.getElementById('editProfilePanel').classList.add('open'); }
function closeEditProfile() { document.getElementById('editProfilePanel').classList.remove('open'); }
async function saveProfile() {
    const newUsername = document.getElementById('editUsername').value;
    const newBio = document.getElementById('editBio').value;
    await db.ref(`users/${currentUser.uid}`).update({ username: newUsername, bio: newBio });
    currentUserData.username = newUsername; currentUserData.bio = newBio;
    closeEditProfile();
    if (document.getElementById('profilePanel').classList.contains('open')) await loadProfileData(currentUser.uid);
    renderFeed();
}
function changeAvatar() { document.getElementById('avatarInput').click(); }
async function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    await db.ref(`users/${currentUser.uid}/avatarUrl`).set(data.secure_url);
    currentUserData.avatarUrl = data.secure_url;
    if (document.getElementById('profilePanel').classList.contains('open')) await loadProfileData(currentUser.uid);
    renderFeed();
}

// ========== المتابعة ==========
async function toggleFollowProfile(userId, btn) {
    if (!currentUser || currentUser.uid === userId) return;
    const userRef = db.ref(`users/${currentUser.uid}/following/${userId}`);
    const targetRef = db.ref(`users/${userId}/followers/${currentUser.uid}`);
    const snap = await userRef.get();
    if (snap.exists()) {
        await userRef.remove(); await targetRef.remove(); btn.innerText = 'متابعة';
        await addNotification(userId, 'unfollow', currentUser.uid);
    } else {
        await userRef.set(true); await targetRef.set(true); btn.innerText = 'متابع';
        await addNotification(userId, 'follow', currentUser.uid);
    }
}

// ========== الإشعارات ==========
async function addNotification(targetUserId, type, fromUserId) {
    if (targetUserId === fromUserId) return;
    const fromUser = allUsers[fromUserId] || { username: 'مستخدم' };
    const messages = { like: 'أعجب بمنشورك', comment: 'علق على منشورك', follow: 'بدأ بمتابعتك', unfollow: 'توقف عن متابعتك' };
    await db.ref(`notifications/${targetUserId}`).push({ type, fromUserId, fromUsername: fromUser.username, message: messages[type], timestamp: Date.now(), read: false });
}
async function openNotifications() {
    const panel = document.getElementById('notificationsPanel');
    const snap = await db.ref(`notifications/${currentUser.uid}`).once('value');
    const notifs = snap.val() || {};
    const container = document.getElementById('notificationsList');
    container.innerHTML = '';
    Object.values(notifs).reverse().forEach(n => {
        container.innerHTML += `<div class="border-b border-gray-800 p-3 flex gap-3"><i class="fas ${n.type === 'like' ? 'fa-heart text-pink-500' : n.type === 'comment' ? 'fa-comment text-cyan-500' : 'fa-user-plus text-green-500'}"></i><div><div>${n.fromUsername}</div><div class="text-sm text-gray-400">${n.message}</div></div></div>`;
        if (!n.read) db.ref(`notifications/${currentUser.uid}/${Object.keys(notifs).find(k => notifs[k] === n)}/read`).set(true);
    });
    panel.classList.add('open');
}
function closeNotifications() { document.getElementById('notificationsPanel').classList.remove('open'); }

// ========== الدردشة الخاصة ==========
async function openConversations() {
    const panel = document.getElementById('conversationsPanel');
    const container = document.getElementById('conversationsList');
    const userId = currentUser.uid;
    const convSnap = await db.ref(`private_chats/${userId}`).once('value');
    const conversations = convSnap.val() || {};
    container.innerHTML = '';
    for (const [otherId, convData] of Object.entries(conversations)) {
        const otherUser = allUsers[otherId];
        if (!otherUser) continue;
        const lastMsg = convData.lastMessage || '';
        container.innerHTML += `<div class="conversation-item" onclick="openPrivateChat('${otherId}')"><div class="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 flex items-center justify-center">${otherUser.avatarUrl ? `<img src="${otherUser.avatarUrl}" class="w-full h-full rounded-full object-cover">` : (otherUser.username?.charAt(0) || '👤')}</div><div><div class="font-bold">@${otherUser.username}</div><div class="text-sm text-gray-500">${lastMsg.substring(0, 40)}</div></div></div>`;
    }
    if (container.innerHTML === '') container.innerHTML = '<div class="text-center text-gray-500 py-10">لا توجد محادثات بعد</div>';
    panel.classList.add('open');
}
function closeConversations() { document.getElementById('conversationsPanel').classList.remove('open'); }
async function openPrivateChat(otherUserId) {
    currentChatUserId = otherUserId;
    const user = allUsers[otherUserId];
    document.getElementById('chatUserName').innerText = `@${user?.username || 'مستخدم'}`;
    document.getElementById('chatAvatar').innerHTML = user?.avatarUrl ? `<img src="${user.avatarUrl}" class="w-full h-full rounded-full object-cover">` : (user?.username?.charAt(0) || '👤');
    await loadPrivateMessages(otherUserId);
    document.getElementById('chatPanel').classList.add('open');
    closeConversations();
}
function closeChat() { document.getElementById('chatPanel').classList.remove('open'); currentChatUserId = null; }
async function loadPrivateMessages(otherUserId) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '<div class="text-center text-gray-500 py-10">جاري التحميل...</div>';
    const chatId = getChatId(currentUser.uid, otherUserId);
    const messagesSnap = await db.ref(`private_messages/${chatId}`).once('value');
    const messages = messagesSnap.val() || {};
    container.innerHTML = '';
    const sorted = Object.entries(messages).sort((a,b)=>a[1].timestamp-b[1].timestamp);
    for (const [id, msg] of sorted) {
        const isSent = msg.senderId === currentUser.uid;
        const time = new Date(msg.timestamp).toLocaleTimeString();
        let content = '';
        if (msg.type === 'text') content = `<div class="message-bubble ${isSent ? 'sent' : 'received'}">${msg.text}</div>`;
        else if (msg.type === 'image') content = `<img src="${msg.imageUrl}" class="message-image" onclick="window.open('${msg.imageUrl}')">`;
        container.innerHTML += `<div class="chat-message ${isSent ? 'sent' : 'received'}"><div>${content}<div class="text-[10px] opacity-50 mt-1">${time}</div></div></div>`;
    }
    if (container.innerHTML === '') container.innerHTML = '<div class="text-center text-gray-500 py-10">لا توجد رسائل بعد</div>';
    container.scrollTop = container.scrollHeight;
}
async function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    if (!text || !currentChatUserId) return;
    const chatId = getChatId(currentUser.uid, currentChatUserId);
    await db.ref(`private_messages/${chatId}`).push({ senderId: currentUser.uid, senderName: currentUserData?.username, text, type: 'text', timestamp: Date.now() });
    await db.ref(`private_chats/${currentUser.uid}/${currentChatUserId}`).set({ lastMessage: text, lastTimestamp: Date.now(), withUser: currentChatUserId });
    await db.ref(`private_chats/${currentChatUserId}/${currentUser.uid}`).set({ lastMessage: text, lastTimestamp: Date.now(), withUser: currentUser.uid });
    input.value = '';
    await loadPrivateMessages(currentChatUserId);
}
async function sendChatImage(input) {
    const file = input.files[0];
    if (!file || !currentChatUserId) return;
    const fd = new FormData(); fd.append('file', file); fd.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    const chatId = getChatId(currentUser.uid, currentChatUserId);
    await db.ref(`private_messages/${chatId}`).push({ senderId: currentUser.uid, senderName: currentUserData?.username, imageUrl: data.secure_url, type: 'image', timestamp: Date.now() });
    await db.ref(`private_chats/${currentUser.uid}/${currentChatUserId}`).set({ lastMessage: '📷 صورة', lastTimestamp: Date.now(), withUser: currentChatUserId });
    await db.ref(`private_chats/${currentChatUserId}/${currentUser.uid}`).set({ lastMessage: '📷 صورة', lastTimestamp: Date.now(), withUser: currentUser.uid });
    input.value = '';
    await loadPrivateMessages(currentChatUserId);
}
function getChatId(uid1, uid2) { return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`; }
db.ref(`private_messages`).on('child_added', async (snapshot) => {
    const chatId = snapshot.key;
    if (currentChatUserId && chatId === getChatId(currentUser.uid, currentChatUserId)) await loadPrivateMessages(currentChatUserId);
    if (document.getElementById('conversationsPanel').classList.contains('open')) openConversations();
});

// ========== التنقل ==========
function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(t => t.classList.remove('active'));
    if (event.target.closest('.nav-item')) event.target.closest('.nav-item').classList.add('active');
    if (tab === 'search') openSearch();
    if (tab === 'notifications') openNotifications();
    if (tab === 'profile') openMyProfile();
    if (tab === 'feed') { closeSearch(); closeNotifications(); closeProfile(); closeConversations(); closeChat(); }
}

// ========== مراقبة المستخدم ==========
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user; await loadUserData(); checkAdminStatus();
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        const presenceRef = db.ref('presence/' + user.uid);
        presenceRef.set(true); presenceRef.onDisconnect().remove();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
    }
});
console.log('✅ instagrami Ready');
