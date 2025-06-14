const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8080';
let token = null;
let userId = null;
let noteId = null;

async function testAPI() {
    try {
        console.log('🧪 Starting API Tests...\n');

        // Test 1: Signup
        console.log('1️⃣ Testing Signup...');
        const signupRes = await fetch(`${BASE_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser',
                email: 'test@example.com',
                password: 'testpass123'
            })
        });
        const signupData = await signupRes.json();
        console.log('Signup Response:', signupData);
        console.log('✅ Signup Test Completed\n');

        // Test 2: Login
        console.log('2️⃣ Testing Login...');
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser',
                password: 'testpass123'
            })
        });
        const loginData = await loginRes.json();
        token = loginData.token;
        userId = loginData.userId;
        console.log('Login Response:', { ...loginData, token: '***' });
        console.log('✅ Login Test Completed\n');

        // Test 3: Create Note
        console.log('3️⃣ Testing Create Note...');
        const createNoteRes = await fetch(`${BASE_URL}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Test Note',
                content: 'This is a test note content'
            })
        });
        const createNoteData = await createNoteRes.json();
        noteId = createNoteData.note._id;
        console.log('Create Note Response:', createNoteData);
        console.log('✅ Create Note Test Completed\n');

        // Test 4: Get All Notes
        console.log('4️⃣ Testing Get All Notes...');
        const getNotesRes = await fetch(`${BASE_URL}/notes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getNotesData = await getNotesRes.json();
        console.log('Get Notes Response:', getNotesData);
        console.log('✅ Get Notes Test Completed\n');

        // Test 5: Update Note
        console.log('5️⃣ Testing Update Note...');
        const updateNoteRes = await fetch(`${BASE_URL}/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: 'Updated Test Note',
                content: 'This is an updated test note content'
            })
        });
        const updateNoteData = await updateNoteRes.json();
        console.log('Update Note Response:', updateNoteData);
        console.log('✅ Update Note Test Completed\n');

        // Test 6: Delete Note
        console.log('6️⃣ Testing Delete Note...');
        const deleteNoteRes = await fetch(`${BASE_URL}/notes/${noteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const deleteNoteData = await deleteNoteRes.json();
        console.log('Delete Note Response:', deleteNoteData);
        console.log('✅ Delete Note Test Completed\n');

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testAPI(); 