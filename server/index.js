const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const DATA_FILE = './data.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "secret123"; 

const loadProducts = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(DATA_FILE)); } catch (e) { return []; }
};

const saveProducts = (p) => fs.writeFileSync(DATA_FILE, JSON.stringify(p, null, 2));
let products = loadProducts();

const isAdmin = (req, res, next) => {
    const providedPwd = req.query.pwd || req.body.pwd;
    if (providedPwd === ADMIN_PASSWORD) return next();
    res.status(403).send("<h1 style='text-align:center; font-family:sans-serif; margin-top:50px;'>403 Forbidden: Access Denied</h1>");
};

// 1. HOME PAGE
app.get('/', (req, res) => {
  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex items-center justify-center min-h-screen"><div class="text-center bg-white p-12 rounded-2xl shadow-xl border border-gray-100"><h1 class="text-4xl font-black text-indigo-600 mb-2">WholesaleConnect</h1><p class="text-gray-500 mb-8">Direct B2C Wholesale Marketplace</p><a href="/products" class="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg">Browse Inventory</a></div></body></html>');
});

// 2. PRODUCT CATALOG (PUBLIC)
app.get('/products', (req, res) => {
  const cat = req.query.category || "All";
  const filtered = cat === "All" ? products : products.filter(p => p.category === cat);
  
  // CUSTOM CATEGORIES LIST
  const categories = ["All", "Phones & Gadgets", "Laptops", "Home Appliances", "Power Solutions", "Bulk Groceries"];
  
  const filterButtons = categories.map(c => `
    <a href="/products?category=${c}" class="px-4 py-2 rounded-full border ${cat === c ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'} font-medium transition text-sm whitespace-nowrap">
      ${c}
    </a>
  `).join('');

  const cards = filtered.map(p => `
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition flex flex-col">
      <img class="h-48 w-full object-cover" src="${p.image}">
      <div class="p-5 flex-grow">
        <span class="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full uppercase">${p.category || 'General'}</span>
        <h3 class="text-lg font-bold text-gray-800 mt-2">${p.name}</h3>
        <p class="text-indigo-600 font-bold text-xl mt-1">$${p.price}</p>
        <a href="https://wa.me/2340000000000?text=I am interested in ${p.name}" class="block mt-4 text-center bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition">
           WhatsApp Order
        </a>
      </div>
    </div>
  `).join('');

  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 p-4 md:p-12"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-black mb-6 text-gray-900">Wholesale Market</h2><div class="flex overflow-x-auto gap-2 mb-10 pb-2">' + filterButtons + '</div><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">' + (cards || '<p class="text-gray-400 italic">No products in this category yet.</p>') + '</div></div></body></html>');
});

// 3. ADMIN PANEL (MANAGE CATEGORIES)
app.get('/admin', isAdmin, (req, res) => {
  const pwd = req.query.pwd || req.body.pwd;
  const manageList = products.map(p => `
    <div class="flex justify-between items-center bg-gray-50 p-3 rounded-lg border mb-2">
      <span class="font-medium text-sm text-gray-700">${p.name} <span class="text-gray-400 text-xs">(${p.category})</span></span>
      <form action="/delete-product" method="POST" style="margin:0;">
        <input type="hidden" name="pwd" value="${pwd}"><input type="hidden" name="id" value="${p.id}">
        <button type="submit" class="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">Delete</button>
      </form>
    </div>
  `).join('');

  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-100 p-6 md:p-12"><div class="max-w-2xl mx-auto space-y-8"><div class="bg-white p-8 rounded-xl shadow-lg border-t-4 border-indigo-600"><h2 class="text-2xl font-bold mb-6 text-gray-800 text-center uppercase tracking-wider">Inventory Manager</h2><form action="/add-product" method="POST" class="space-y-4"><input type="hidden" name="pwd" value="' + pwd + '"><div class="space-y-1"><label class="text-xs font-bold text-gray-500 uppercase">Product Name</label><input type="text" name="itemName" class="w-full border p-2 rounded-lg" required></div><div class="grid grid-cols-2 gap-4"><div class="space-y-1"><label class="text-xs font-bold text-gray-500 uppercase">Price ($)</label><input type="number" name="itemPrice" class="w-full border p-2 rounded-lg" required></div><div class="space-y-1"><label class="text-xs font-bold text-gray-500 uppercase">Category</label><select name="itemCategory" class="w-full border p-2 rounded-lg"><option>Phones & Gadgets</option><option>Laptops</option><option>Home Appliances</option><option>Power Solutions</option><option>Bulk Groceries</option></select></div></div><div class="space-y-1"><label class="text-xs font-bold text-gray-500 uppercase">Image URL</label><input type="text" name="itemImage" class="w-full border p-2 rounded-lg"></div><button class="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-lg transition">Add to Wholesale Store</button></form></div><div class="bg-white p-8 rounded-xl shadow-lg"><h2 class="text-xl font-bold mb-4 text-gray-800">Current Inventory</h2>' + (manageList || '<p class="text-gray-400 italic text-center py-4">Inventory is empty.</p>') + '</div><a href="/products" class="block text-center text-indigo-600 font-bold hover:underline">← Back to Storefront</a></div></body></html>');
});

// 4. LOGIC
app.post('/add-product', isAdmin, (req, res) => {
  const newItem = { id: Date.now(), name: req.body.itemName, price: req.body.itemPrice, category: req.body.itemCategory, image: req.body.itemImage || 'https://via.placeholder.com/300' };
  products.push(newItem);
  saveProducts(products);
  res.redirect('/admin?pwd=' + req.body.pwd);
});

app.post('/delete-product', isAdmin, (req, res) => {
  products = products.filter(p => p.id != req.body.id);
  saveProducts(products);
  res.redirect('/admin?pwd=' + req.body.pwd);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 WholesaleConnect is live on ' + PORT); });