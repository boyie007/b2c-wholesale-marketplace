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
  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex items-center justify-center min-h-screen"><div class="text-center bg-white p-12 rounded-2xl shadow-xl border border-gray-100"><h1 class="text-4xl font-black text-indigo-600 mb-2 italic">WholesaleConnect</h1><p class="text-gray-500 mb-8 font-medium">Direct B2C Wholesale Marketplace</p><a href="/products" class="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg hover:shadow-indigo-200">Browse Inventory</a></div></body></html>');
});

// 2. PRODUCT CATALOG (PUBLIC WITH SEARCH & BRANDING)
app.get('/products', (req, res) => {
  const cat = req.query.category || "All";
  const search = (req.query.search || "").toLowerCase();
  
  let filtered = cat === "All" ? products : products.filter(p => p.category === cat);
  if(search) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
  }
  
  const categories = ["All", "Phones & Gadgets", "Laptops", "Home Appliances", "Power Solutions", "Bulk Groceries"];
  
  const filterButtons = categories.map(c => `
    <a href="/products?category=${c}${search ? '&search='+search : ''}" class="px-5 py-2 rounded-full border ${cat === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'} font-bold transition text-sm whitespace-nowrap shadow-sm hover:border-indigo-400">
      ${c}
    </a>
  `).join('');

  const cards = filtered.map(p => `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
      <div class="relative overflow-hidden">
        <img class="h-56 w-full object-cover group-hover:scale-105 transition-transform duration-500" src="${p.image}">
        <span class="absolute top-3 left-3 text-[10px] font-bold text-white bg-indigo-600/80 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest">${p.category || 'General'}</span>
      </div>
      <div class="p-6 flex-grow">
        <h3 class="text-xl font-bold text-gray-800 mb-1">${p.name}</h3>
        <p class="text-indigo-600 font-black text-2xl mb-4">$${Number(p.price).toLocaleString()}</p>
        <a href="https://wa.me/2349127603945?text=Hello WholesaleConnect, I want to order: ${encodeURIComponent(p.name)}" class="block text-center bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors shadow-md">
           Order on WhatsApp
        </a>
      </div>
    </div>
  `).join('');

  res.send(`
    <html>
    <head><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-slate-50">
        <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-4">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3">
            <img src="https://i.postimg.cc/placeholder-logo.png" class="h-12 w-auto object-contain" alt="WholesaleConnect Logo">
            <h1 class="text-2xl font-black text-slate-900 italic tracking-tighter hidden md:block">WholesaleConnect</h1>
        </div>
        
        <form action="/products" method="GET" class="relative w-full md:w-96">
            <input type="hidden" name="category" value="${cat}">
            <input type="text" name="search" value="${req.query.search || ''}" placeholder="Search products..." 
                   class="w-full bg-slate-100 border-none rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition">
            <button class="absolute right-3 top-3 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </button>
        </form>
    </div>
</nav>

        <main class="max-w-7xl mx-auto p-4 md:p-12">
            <div class="flex overflow-x-auto gap-3 mb-10 pb-4 no-scrollbar">
                ${filterButtons}
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                ${cards || '<div class="col-span-full py-20 text-center text-slate-400 text-xl italic">No products found matching your request.</div>'}
            </div>
        </main>
    </body>
    </html>
  `);
});

// 3. ADMIN PANEL
app.get('/admin', isAdmin, (req, res) => {
  const pwd = req.query.pwd || req.body.pwd;
  const manageList = products.map(p => `
    <div class="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm">
      <div class="flex items-center gap-4">
        <img src="${p.image}" class="w-12 h-12 object-cover rounded-lg">
        <div>
            <p class="font-bold text-gray-800">${p.name}</p>
            <p class="text-xs text-gray-400 uppercase font-bold">${p.category} • $${p.price}</p>
        </div>
      </div>
      <form action="/delete-product" method="POST" style="margin:0;">
        <input type="hidden" name="pwd" value="${pwd}"><input type="hidden" name="id" value="${p.id}">
        <button type="submit" class="bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all border border-red-100">Delete</button>
      </form>
    </div>
  `).join('');

  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 p-6 md:p-12"><div class="max-w-3xl mx-auto space-y-10"><div class="bg-white p-10 rounded-3xl shadow-xl border border-slate-100"><h2 class="text-3xl font-black mb-8 text-slate-800 text-center uppercase tracking-tighter">Add To Inventory</h2><form action="/add-product" method="POST" class="space-y-6"><input type="hidden" name="pwd" value="' + pwd + '"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="text-[10px] font-black text-slate-400 uppercase ml-1">Product Title</label><input type="text" name="itemName" class="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-indigo-500 outline-none transition" required></div><div><label class="text-[10px] font-black text-slate-400 uppercase ml-1">Wholesale Price ($)</label><input type="number" name="itemPrice" class="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-indigo-500 outline-none transition" required></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="text-[10px] font-black text-slate-400 uppercase ml-1">Select Category</label><select name="itemCategory" class="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-indigo-500 outline-none transition"><option>Phones & Gadgets</option><option>Laptops</option><option>Home Appliances</option><option>Power Solutions</option><option>Bulk Groceries</option></select></div><div><label class="text-[10px] font-black text-slate-400 uppercase ml-1">Image Link (URL)</label><input type="text" name="itemImage" class="w-full border-2 border-slate-100 p-3 rounded-xl focus:border-indigo-500 outline-none transition" placeholder="https://..."></div></div><button class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 shadow-lg transition-all transform hover:-translate-y-1">LIST PRODUCT NOW</button></form></div><div><h2 class="text-xl font-black mb-6 text-slate-800 flex items-center gap-2"><span class="w-2 h-6 bg-indigo-600 rounded-full"></span> Active Inventory</h2>' + (manageList || '<div class="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 italic">No items listed yet.</div>') + '</div><div class="text-center pt-6"><a href="/products" class="text-slate-400 font-bold hover:text-indigo-600 transition">← Return to Public Storefront</a></div></div></body></html>');
});

// 4. SERVER LOGIC
app.post('/add-product', isAdmin, (req, res) => {
  const newItem = { id: Date.now(), name: req.body.itemName, price: req.body.itemPrice, category: req.body.itemCategory, image: req.body.itemImage || 'https://via.placeholder.com/400x300?text=No+Image' };
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
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 WholesaleConnect running on ' + PORT); });