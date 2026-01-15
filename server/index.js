const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const DATA_FILE = './data.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "secret123"; 

const loadProducts = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (e) { return []; }
};

const saveProducts = (p) => fs.writeFileSync(DATA_FILE, JSON.stringify(p, null, 2));
let products = loadProducts();

const isAdmin = (req, res, next) => {
    const providedPwd = req.query.pwd || req.body.pwd;
    if (providedPwd === ADMIN_PASSWORD) return next();
    res.status(403).send("<h1>403 Forbidden: Admin Access Only</h1>");
};

// 1. HOME
app.get('/', (req, res) => {
  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex items-center justify-center min-h-screen"><div class="text-center bg-white p-12 rounded-2xl shadow-xl border border-gray-100"><h1 class="text-4xl font-black text-indigo-600 mb-2">WholesaleConnect</h1><p class="text-gray-500 mb-8">Direct B2C Wholesale Marketplace</p><a href="/products" class="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg">Browse Inventory</a></div></body></html>');
});

// 2. PRODUCTS (PUBLIC)
app.get('/products', (req, res) => {
  const searchTerm = req.query.search || "";
  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const cards = filtered.map(p => `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <img class="h-48 w-full object-cover" src="${p.image}">
      <div class="p-5">
        <h3 class="text-lg font-bold text-gray-800">${p.name}</h3>
        <p class="text-indigo-600 font-bold text-xl mt-1">$${p.price}</p>
        <a href="https://wa.me/2349127603945 class="block mt-4 text-center bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600">Order via WhatsApp</a>
      </div>
    </div>
  `).join('');

  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 p-6 md:p-12"><div class="max-w-6xl mx-auto"><div class="flex flex-col md:flex-row justify-between items-center mb-10 gap-4"><h2 class="text-3xl font-black text-gray-900">Marketplace</h2><form action="/products" method="GET" class="flex w-full md:w-auto gap-2"><input type="text" name="search" value="' + searchTerm + '" placeholder="Search..." class="border border-gray-300 p-2 rounded-lg flex-grow"><button class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold">Search</button></form></div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">' + cards + '</div></div></body></html>');
});

// 3. ADMIN PANEL (WITH DELETE)
app.get('/admin', isAdmin, (req, res) => {
  const pwd = req.query.pwd || req.body.pwd;
  const manageList = products.map(p => `
    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border mb-2">
      <div class="flex items-center gap-3">
        <img src="${p.image}" class="w-10 h-10 object-cover rounded">
        <span class="font-medium">${p.name} - $${p.price}</span>
      </div>
      <form action="/delete-product" method="POST" style="margin:0;">
        <input type="hidden" name="pwd" value="${pwd}">
        <input type="hidden" name="id" value="${p.id}">
        <button type="submit" style="background:red; color:white; padding:5px 10px; border-radius:5px; border:none; cursor:pointer;">Delete</button>
      </form>
    </div>
  `).join('');

  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-100 p-6"><div class="max-w-2xl mx-auto space-y-8"><div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-2xl font-bold mb-6 text-gray-800">Add New Product</h2><form action="/add-product" method="POST" class="space-y-4"><input type="hidden" name="pwd" value="' + pwd + '"><input type="text" name="itemName" placeholder="Product Name" class="w-full border p-2 rounded-lg" required><input type="number" name="itemPrice" placeholder="Price" class="w-full border p-2 rounded-lg" required><input type="text" name="itemImage" placeholder="Image URL" class="w-full border p-2 rounded-lg"><button class="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">Publish Product</button></form></div><div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-2xl font-bold mb-6 text-gray-800">Manage Inventory</h2>' + manageList + '</div></div></body></html>');
});

// 4. ADD LOGIC
app.post('/add-product', isAdmin, (req, res) => {
  const newItem = { id: Date.now(), name: req.body.itemName, price: req.body.itemPrice, image: req.body.itemImage || 'https://via.placeholder.com/300' };
  products.push(newItem);
  saveProducts(products);
  res.redirect('/admin?pwd=' + (req.body.pwd || ''));
});

// 5. DELETE LOGIC
app.post('/delete-product', isAdmin, (req, res) => {
    products = products.filter(p => p.id != req.body.id);
    saveProducts(products);
    res.redirect('/admin?pwd=' + (req.body.pwd || ''));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { 
    console.log('🚀 Server is live on port ' + PORT); 
});