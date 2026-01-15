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
    res.status(403).send("<h1 style='text-align:center; font-family:sans-serif; margin-top:50px;'>403 Forbidden</h1>");
};

// 1. HOME PAGE
app.get('/', (req, res) => {
  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex items-center justify-center min-h-screen"><div class="text-center bg-white p-12 rounded-2xl shadow-xl border border-gray-100"><h1 class="text-4xl font-black text-indigo-600 mb-2 italic">WholesaleConnect</h1><p class="text-gray-500 mb-8 font-medium">Direct B2C Wholesale Marketplace</p><a href="/products" class="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg">Browse Inventory</a></div></body></html>');
});

// 2. PRODUCT CATALOG
app.get('/products', (req, res) => {
  const cat = req.query.category || "All";
  const search = (req.query.search || "").toLowerCase();
  let filtered = cat === "All" ? products : products.filter(p => p.category === cat);
  if(search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
  
  const categories = ["All", "Phones & Gadgets", "Laptops", "Home Appliances", "Power Solutions", "Bulk Groceries"];
  const filterButtons = categories.map(c => `<a href="/products?category=${c}${search ? '&search='+search : ''}" class="px-5 py-2 rounded-full border ${cat === c ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'} font-bold text-sm whitespace-nowrap shadow-sm">${c}</a>`).join('');

  const cards = filtered.map(p => `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group">
      <div class="relative overflow-hidden"><img class="h-56 w-full object-cover group-hover:scale-105 transition" src="${p.image}"><span class="absolute top-3 left-3 text-[10px] font-bold text-white bg-indigo-600/80 backdrop-blur-md px-3 py-1 rounded-full uppercase">${p.category}</span></div>
      <div class="p-6 flex-grow"><h3 class="text-xl font-bold text-gray-800 mb-1">${p.name}</h3><p class="text-indigo-600 font-black text-2xl mb-4">$${Number(p.price).toLocaleString()}</p>
        <a href="https://wa.me/2349127603945?text=I want to order: ${encodeURIComponent(p.name)}" class="block text-center bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600">Order on WhatsApp</a>
      </div>
    </div>`).join('');

  res.send(`
    <html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 flex flex-col min-h-screen">
        <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b p-4">
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black italic">W</div>
                    <h1 class="text-2xl font-black text-slate-900 italic">WholesaleConnect</h1>
                </div>
                <form action="/products" method="GET" class="relative w-full md:w-96">
                    <input type="hidden" name="category" value="${cat}"><input type="text" name="search" value="${req.query.search || ''}" placeholder="Search..." class="w-full bg-slate-100 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500">
                </form>
            </div>
        </nav>
        <main class="max-w-7xl mx-auto p-4 md:p-12 flex-grow">
            <div class="flex overflow-x-auto gap-3 mb-10 pb-2">${filterButtons}</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">${cards || '<p class="text-center col-span-full py-10">No products found.</p>'}</div>
        </main>
        <footer class="bg-slate-900 text-white mt-20 pt-16 pb-8 px-6">
            <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-slate-800 pb-12">
                <div><h3 class="text-2xl font-black italic mb-4">WholesaleConnect</h3><p class="text-slate-400">Your number one direct B2C wholesale partner. Quality products at the best prices.</p></div>
                <div><h4 class="font-bold mb-4 uppercase text-sm tracking-widest text-indigo-400">Contact Us</h4><p class="text-slate-300">WhatsApp: +234 912 760 3945</p><p class="text-slate-300">Email: sales@wholesaleconnect.com</p></div>
                <div><h4 class="font-bold mb-4 uppercase text-sm tracking-widest text-indigo-400">Opening Hours</h4><p class="text-slate-300">Mon - Sat: 8:00 AM - 6:00 PM</p><p class="text-slate-300">Sun: Closed</p></div>
            </div>
            <div class="max-w-7xl mx-auto pt-8 text-center text-slate-500 text-xs uppercase tracking-widest font-bold">© 2026 WholesaleConnect Marketplace. All Rights Reserved.</div>
        </footer>
    </body></html>
  `);
});

// ADMIN & LOGIC ROUTES REMAIN SAME AS PREVIOUS...
app.get('/admin', isAdmin, (req, res) => {
    const pwd = req.query.pwd || req.body.pwd;
    const manageList = products.map(p => `<div class="flex justify-between items-center bg-white p-4 rounded-xl border mb-3 shadow-sm"><div class="flex items-center gap-4"><img src="${p.image}" class="w-12 h-12 object-cover rounded-lg"><div><p class="font-bold text-gray-800">${p.name}</p><p class="text-xs text-gray-400 uppercase font-bold">${p.category} • $${p.price}</p></div></div><form action="/delete-product" method="POST" style="margin:0;"><input type="hidden" name="pwd" value="${pwd}"><input type="hidden" name="id" value="${p.id}"><button type="submit" class="bg-red-50 text-red-500 px-4 py-2 rounded-lg text-xs font-bold border border-red-100">Delete</button></form></div>`).join('');
    res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 p-6 md:p-12"><div class="max-w-3xl mx-auto space-y-10"><div class="bg-white p-10 rounded-3xl shadow-xl"><h2 class="text-3xl font-black mb-8 text-slate-800 text-center uppercase tracking-tighter">Add To Inventory</h2><form action="/add-product" method="POST" class="space-y-6"><input type="hidden" name="pwd" value="' + pwd + '"><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="text-[10px] font-black text-slate-400 uppercase">Product Title</label><input type="text" name="itemName" class="w-full border-2 p-3 rounded-xl" required></div><div><label class="text-[10px] font-black text-slate-400 uppercase">Wholesale Price ($)</label><input type="number" name="itemPrice" class="w-full border-2 p-3 rounded-xl" required></div></div><div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label class="text-[10px] font-black text-slate-400 uppercase">Select Category</label><select name="itemCategory" class="w-full border-2 p-3 rounded-xl"><option>Phones & Gadgets</option><option>Laptops</option><option>Home Appliances</option><option>Power Solutions</option><option>Bulk Groceries</option></select></div><div><label class="text-[10px] font-black text-slate-400 uppercase">Image Link (URL)</label><input type="text" name="itemImage" class="w-full border-2 p-3 rounded-xl"></div></div><button class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition">LIST PRODUCT NOW</button></form></div><div>' + manageList + '</div></div></body></html>');
});

app.post('/add-product', isAdmin, (req, res) => {
    const newItem = { id: Date.now(), name: req.body.itemName, price: req.body.itemPrice, category: req.body.itemCategory, image: req.body.itemImage || 'https://via.placeholder.com/400x300?text=No+Image' };
    products.push(newItem); saveProducts(products); res.redirect('/admin?pwd=' + req.body.pwd);
});

app.post('/delete-product', isAdmin, (req, res) => {
    products = products.filter(p => p.id != req.body.id); saveProducts(products); res.redirect('/admin?pwd=' + req.body.pwd);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 WholesaleConnect running on ' + PORT); });