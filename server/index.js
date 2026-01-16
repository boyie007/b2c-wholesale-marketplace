const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- 1. MIDDLEWARE (MUST BE AT THE TOP) ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. DATABASE CONNECTION ---
const MONGO_URI = "mongodb+srv://boyie007:Jesusislord1995@cluster0.wkkksmf.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ DB Connected"))
    .catch(err => console.log("❌ DB Error:", err));

const Product = mongoose.model('Product', {
    name: String,
    price: Number,
    category: String,
    image: String
});

// --- 3. SECURE CLOUDINARY SETUP ---
// This looks for the keys you put in Render's Environment Variables
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { 
    folder: 'wholesale_connect', 
    allowed_formats: ['jpg', 'png', 'jpeg'] 
  },
});
const upload = multer({ storage: storage });

// --- 4. ADMIN SECURITY CHECK ---
const isAdmin = (req, res, next) => {
    // Safety check to prevent "undefined" errors
    const queryPwd = req.query ? req.query.pwd : null;
    const bodyPwd = req.body ? req.body.pwd : null;
    
    const providedPwd = queryPwd || bodyPwd;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "secret123"; 

    if (providedPwd === ADMIN_PASSWORD) {
        return next();
    }
    res.status(403).send("<h1>403 Forbidden</h1><p>Invalid admin password.</p>");
};

const formatNaira = (num) => '₦' + Number(num).toLocaleString();

// --- 5. ROUTES ---

// HOME PAGE
app.get('/', (req, res) => {
  res.send('<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-gray-50 flex items-center justify-center min-h-screen"><div class="text-center bg-white p-12 rounded-2xl shadow-xl border border-gray-100"><h1 class="text-4xl font-black text-indigo-600 mb-2 italic">WholesaleConnect</h1><p class="text-gray-500 mb-8 font-medium">Direct B2C Wholesale Marketplace</p><a href="/products" class="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold hover:bg-indigo-700 transition shadow-lg">Browse Inventory</a></div></body></html>');
});

// PRODUCTS PAGE
app.get('/products', async (req, res) => {
  const cat = req.query.category || "All";
  const search = (req.query.search || "").toLowerCase();
  let query = cat === "All" ? {} : { category: cat };
  if(search) query.name = { $regex: search, $options: 'i' };
  
  const products = await Product.find(query);
  const categories = ["All", "Phones & Gadgets", "Laptops", "Home Appliances", "Power Solutions", "Bulk Groceries"];
  
  const filterButtons = categories.map(c => `<a href="/products?category=${c}${search ? '&search='+search : ''}" class="px-5 py-2 rounded-full border ${cat === c ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'} font-bold text-sm whitespace-nowrap shadow-sm">${c}</a>`).join('');

  const cards = products.map(p => `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col group">
      <div class="relative overflow-hidden"><img class="h-56 w-full object-cover group-hover:scale-105 transition" src="${p.image}"><span class="absolute top-3 left-3 text-[10px] font-bold text-white bg-indigo-600/80 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest">${p.category}</span></div>
      <div class="p-6 flex-grow"><h3 class="text-xl font-bold text-gray-800 mb-1">${p.name}</h3>
        <p class="text-indigo-600 font-black text-2xl mb-4">${formatNaira(p.price)}</p>
        <a href="https://wa.me/2349127603945?text=Hello, I want to order ${encodeURIComponent(p.name)} for ${formatNaira(p.price)}" class="block text-center bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600">Order on WhatsApp</a>
      </div>
    </div>`).join('');

  res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 flex flex-col min-h-screen"><nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b p-4"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4"><div class="flex items-center gap-3"><div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black italic text-xl">W</div><h1 class="text-2xl font-black text-slate-900 italic tracking-tighter">WholesaleConnect</h1></div><form action="/products" method="GET" class="relative w-full md:w-96"><input type="hidden" name="category" value="${cat}"><input type="text" name="search" value="${req.query.search || ''}" placeholder="Search products..." class="w-full bg-slate-100 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500"></form></div></nav><main class="max-w-7xl mx-auto p-4 md:p-12 flex-grow"><div class="flex overflow-x-auto gap-3 mb-10 pb-2">${filterButtons}</div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">${cards || '<p class="text-center col-span-full py-10 text-slate-400 italic">No products found.</p>'}</div></main></body></html>`);
});

// ADMIN PANEL
app.get('/admin', isAdmin, async (req, res) => {
    const pwd = req.query.pwd || req.body.pwd;
    const products = await Product.find();
    const manageList = products.map(p => `<div class="flex justify-between items-center bg-white p-4 rounded-xl border mb-3 shadow-sm"><div class="flex items-center gap-4"><img src="${p.image}" class="w-12 h-12 object-cover rounded-lg"><div><p class="font-bold text-gray-800">${p.name}</p><p class="text-xs text-gray-400 font-bold">${p.category} • ${formatNaira(p.price)}</p></div></div><form action="/delete-product" method="POST" style="margin:0;"><input type="hidden" name="pwd" value="${pwd}"><input type="hidden" name="id" value="${p._id}"><button type="submit" class="text-red-500 font-bold text-xs">Delete</button></form></div>`).join('');
    
    res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 p-6 md:p-12"><div class="max-w-3xl mx-auto space-y-10"><div class="bg-white p-10 rounded-3xl shadow-xl"><h2 class="text-2xl font-black mb-6">Add New Product</h2>
    <form action="/add-product" method="POST" enctype="multipart/form-data" class="space-y-4">
      <input type="hidden" name="pwd" value="${pwd}">
      <input type="text" name="itemName" placeholder="Product Name" class="w-full border p-3 rounded-xl" required>
      <input type="number" name="itemPrice" placeholder="Price (₦)" class="w-full border p-3 rounded-xl" required>
      <select name="itemCategory" class="w-full border p-3 rounded-xl">
        <option>Phones & Gadgets</option><option>Laptops</option><option>Home Appliances</option><option>Power Solutions</option><option>Bulk Groceries</option>
      </select>
      <label class="block text-xs font-bold text-gray-400 uppercase">Product Image</label>
      <input type="file" name="itemImage" class="w-full border p-3 rounded-xl" accept="image/*" required>
      <button class="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">Upload & List Product</button>
    </form></div>${manageList}</div></body></html>`);
});

// ADD PRODUCT (WITH IMAGE UPLOAD)
app.post('/add-product', isAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        console.log("--- Upload Attempt Started ---");
        
        if (!req.file) {
            console.log("❌ No file found in request");
            return res.status(400).send("No image file was selected.");
        }

        console.log("✅ File received from form, sending to Cloudinary...");

        const newProduct = new Product({ 
          name: req.body.itemName, 
          price: req.body.itemPrice, 
          category: req.body.itemCategory, 
          image: req.file.path // Cloudinary URL
        });

        await newProduct.save();
        console.log("✅ Product saved to MongoDB");
        
        res.redirect('/admin?pwd=' + req.body.pwd);
    } catch (err) {
        // This will print the FULL error text in Render Logs
        console.error("🛑 UPLOAD ERROR DETAILS:", err);
        res.status(500).send("Upload Failed: " + (err.message || "Unknown Error"));
    }
});

// DELETE PRODUCT
app.post('/delete-product', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.body.id);
    res.redirect('/admin?pwd=' + req.body.pwd);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 Server running smoothly'); });  