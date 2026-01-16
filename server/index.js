const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- DATABASE CONNECTION ---
const MONGO_URI = "mongodb+srv://boyie007:Jesusislord1995@cluster0.wkkksmf.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI).then(() => console.log("✅ DB Connected")).catch(err => console.log(err));

const Product = mongoose.model('Product', {
    name: String,
    price: Number,
    category: String,
    image: String
});

// --- CLOUDINARY SETUP ---
// Replace these with your actual Cloudinary details
cloudinary.config({ 
  cloud_name: 'dmo1th3xi', 
  api_key: 'YO961194154614635', 
  api_secret: '**********' 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'wholesale_connect', allowed_formats: ['jpg', 'png', 'jpeg'] },
});
const upload = multer({ storage: storage });

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "secret123";
const formatNaira = (num) => '₦' + Number(num).toLocaleString();

const isAdmin = (req, res, next) => {
    const providedPwd = req.query.pwd || req.body.pwd;
    if (providedPwd === ADMIN_PASSWORD) return next();
    res.status(403).send("403 Forbidden");
};

// 1. HOME & 2. PRODUCTS (Same as before)
app.get('/', (req, res) => {
  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex items-center justify-center min-h-screen"><div class="text-center bg-white p-12 rounded-2xl shadow-xl border border-gray-100"><h1 class="text-4xl font-black text-indigo-600 mb-2 italic">WholesaleConnect</h1><p class="text-gray-500 mb-8 font-medium">Direct B2C Wholesale Marketplace</p><a href="/products" class="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg">Browse Inventory</a></div></body></html>');
});

app.get('/products', async (req, res) => {
  const cat = req.query.category || "All";
  const search = (req.query.search || "").toLowerCase();
  let query = cat === "All" ? {} : { category: cat };
  if(search) query.name = { $regex: search, $options: 'i' };
  const products = await Product.find(query);
  const categories = ["All", "Phones & Gadgets", "Laptops", "Home Appliances", "Power Solutions", "Bulk Groceries"];
  const filterButtons = categories.map(c => `<a href="/products?category=${c}${search ? '&search='+search : ''}" class="px-5 py-2 rounded-full border ${cat === c ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'} font-bold text-sm whitespace-nowrap shadow-sm">${c}</a>`).join('');
  const cards = products.map(p => `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group"><div class="relative overflow-hidden"><img class="h-56 w-full object-cover group-hover:scale-105 transition" src="${p.image}"><span class="absolute top-3 left-3 text-[10px] font-bold text-white bg-indigo-600/80 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest">${p.category}</span></div><div class="p-6 flex-grow"><h3 class="text-xl font-bold text-gray-800 mb-1">${p.name}</h3><p class="text-indigo-600 font-black text-2xl mb-4">${formatNaira(p.price)}</p><a href="https://wa.me/2349127603945?text=Hello, I want to order ${encodeURIComponent(p.name)} for ${formatNaira(p.price)}" class="block text-center bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600">Order on WhatsApp</a></div></div>`).join('');
  res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 flex flex-col min-h-screen"><nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b p-4"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4"><div class="flex items-center gap-3"><div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black italic text-xl">W</div><h1 class="text-2xl font-black text-slate-900 italic tracking-tighter">WholesaleConnect</h1></div><form action="/products" method="GET" class="relative w-full md:w-96"><input type="hidden" name="category" value="${cat}"><input type="text" name="search" value="${req.query.search || ''}" placeholder="Search products..." class="w-full bg-slate-100 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500"></form></div></nav><main class="max-w-7xl mx-auto p-4 md:p-12 flex-grow"><div class="flex overflow-x-auto gap-3 mb-10 pb-2">${filterButtons}</div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">${cards || '<p class="text-center col-span-full py-10 text-slate-400 italic">No products found.</p>'}</div></main><footer class="bg-slate-900 text-white py-8 text-center text-xs uppercase tracking-widest font-bold">© 2026 WholesaleConnect Marketplace</footer></body></html>`);
});

// 3. UPDATED ADMIN PANEL WITH FILE UPLOAD
app.get('/admin', isAdmin, async (req, res) => {
    const pwd = req.query.pwd || req.body.pwd;
    const products = await Product.find();
    const manageList = products.map(p => `<div class="flex justify-between items-center bg-white p-4 rounded-xl border mb-3 shadow-sm"><div class="flex items-center gap-4"><img src="${p.image}" class="w-12 h-12 object-cover rounded-lg"><div><p class="font-bold text-gray-800">${p.name}</p><p class="text-xs text-gray-400 font-bold">${p.category} • ${formatNaira(p.price)}</p></div></div><form action="/delete-product" method="POST" style="margin:0;"><input type="hidden" name="pwd" value="${pwd}"><input type="hidden" name="id" value="${p._id}"><button type="submit" class="bg-red-50 text-red-500 px-4 py-2 rounded-lg text-xs font-bold border border-red-100">Delete</button></form></div>`).join('');
    res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 p-6 md:p-12"><div class="max-w-3xl mx-auto space-y-10"><div class="bg-white p-10 rounded-3xl shadow-xl"><h2 class="text-3xl font-black mb-8 text-slate-800 text-center uppercase tracking-tighter">Inventory Manager</h2>
    <form action="/add-product" method="POST" enctype="multipart/form-data" class="space-y-6">
        <input type="hidden" name="pwd" value="${pwd}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label class="text-[10px] font-black text-slate-400 uppercase">Product Name</label><input type="text" name="itemName" class="w-full border-2 p-3 rounded-xl" required></div>
            <div><label class="text-[10px] font-black text-slate-400 uppercase">Price (₦)</label><input type="number" name="itemPrice" class="w-full border-2 p-3 rounded-xl" required></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label class="text-[10px] font-black text-slate-400 uppercase">Category</label><select name="itemCategory" class="w-full border-2 p-3 rounded-xl"><option>Phones & Gadgets</option><option>Laptops</option><option>Home Appliances</option><option>Power Solutions</option><option>Bulk Groceries</option></select></div>
            <div><label class="text-[10px] font-black text-slate-400 uppercase">Upload Photo</label><input type="file" name="itemImage" class="w-full border-2 p-3 rounded-xl" accept="image/*" required></div>
        </div>
        <button class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-indigo-600 transition">LIST PRODUCT NOW</button>
    </form></div><div>${manageList}</div></div></body></html>`);
});

app.post('/add-product', isAdmin, upload.single('itemImage'), async (req, res) => {
    await new Product({ 
      name: req.body.itemName, 
      price: req.body.itemPrice, 
      category: req.body.itemCategory, 
      image: req.file.path // This gets the link from Cloudinary automatically!
    }).save();
    res.redirect('/admin?pwd=' + req.body.pwd);
});

app.post('/delete-product', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.body.id);
    res.redirect('/admin?pwd=' + req.body.pwd);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 WholesaleConnect with Image Uploads Live'); });