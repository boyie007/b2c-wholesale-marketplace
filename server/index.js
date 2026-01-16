const express = require('express');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();

// --- 1. MIDDLEWARE ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. DATABASE CONNECTION ---
const MONGO_URI = "mongodb+srv://boyie007:Jesusislord1995@cluster0.wkkksmf.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

const Product = mongoose.model('Product', {
    name: String,
    price: Number,
    category: String,
    image: String
});

// --- 3. CLOUDINARY SETUP (Ensure these variables are in Render) ---
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

// --- 4. SECURITY CHECK ---
const MY_PASSWORD = "Jesusislord1995"; // Your specific password

const isAdmin = (req, res, next) => {
    const providedPwd = (req.query && req.query.pwd) || (req.body && req.body.pwd);
    if (providedPwd === MY_PASSWORD) return next();
    res.status(403).send("<h1>403 Forbidden</h1><p>Invalid admin password. Use ?pwd=Jesusislord1995 in your link.</p>");
};

const formatNaira = (num) => '₦' + Number(num).toLocaleString();

// --- 5. ROUTES ---

// Public Products Page
app.get('/products', async (req, res) => {
  const cat = req.query.category || "All";
  const search = (req.query.search || "").toLowerCase();
  let query = cat === "All" ? {} : { category: cat };
  if(search) query.name = { $regex: search, $options: 'i' };
  
  const products = await Product.find(query);
  const categories = ["All", "Phones & Gadgets", "Laptops", "Home Appliances", "Power Solutions", "Bulk Groceries"];
  
  const filterButtons = categories.map(c => `<a href="/products?category=${c}${search ? '&search='+search : ''}" class="px-4 py-2 rounded-full border ${cat === c ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'} font-bold text-xs shadow-sm">${c}</a>`).join('');

  const cards = products.map(p => `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <img class="h-48 w-full object-cover" src="${p.image}">
      <div class="p-5 flex-grow">
        <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">${p.category}</span>
        <h3 class="text-lg font-bold text-gray-800 mb-1">${p.name}</h3>
        <p class="text-indigo-600 font-black text-xl mb-4">${formatNaira(p.price)}</p>
        <a href="https://wa.me/2349127603945?text=Hello, I want to order ${encodeURIComponent(p.name)}" class="block text-center bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600">Order on WhatsApp</a>
      </div>
    </div>`).join('');

  res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 min-h-screen p-4 md:p-10"><div class="max-w-7xl mx-auto"><h1 class="text-3xl font-black mb-6 italic text-slate-900">WholesaleConnect</h1><div class="flex overflow-x-auto gap-2 mb-8 pb-2">${filterButtons}</div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${cards || '<p class="text-slate-400">No products available.</p>'}</div></div></body></html>`);
});

// Admin Panel (GET)
app.get('/admin', isAdmin, async (req, res) => {
    const products = await Product.find();
    const manageList = products.map(p => `
        <div class="flex justify-between items-center bg-white p-3 rounded-xl border mb-2">
            <div class="flex items-center gap-3">
                <img src="${p.image}" class="w-10 h-10 object-cover rounded-md">
                <p class="font-bold text-sm">${p.name}</p>
            </div>
            <form action="/delete-product" method="POST" class="m-0">
                <input type="hidden" name="pwd" value="${MY_PASSWORD}">
                <input type="hidden" name="id" value="${p._id}">
                <button type="submit" class="text-red-500 text-xs font-bold">Delete</button>
            </form>
        </div>`).join('');
    
    res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-50 p-6 md:p-12"><div class="max-w-xl mx-auto"><div class="bg-white p-8 rounded-3xl shadow-lg mb-10"><h2 class="text-2xl font-black mb-6 uppercase tracking-tighter">Add Product</h2>
    <form action="/add-product" method="POST" enctype="multipart/form-data" class="space-y-4">
      <input type="hidden" name="pwd" value="${MY_PASSWORD}">
      <input type="text" name="itemName" placeholder="Product Name" class="w-full border p-3 rounded-xl" required>
      <input type="number" name="itemPrice" placeholder="Price (₦)" class="w-full border p-3 rounded-xl" required>
      <select name="itemCategory" class="w-full border p-3 rounded-xl">
        <option>Phones & Gadgets</option><option>Laptops</option><option>Home Appliances</option><option>Power Solutions</option><option>Bulk Groceries</option>
      </select>
      <input type="file" name="itemImage" class="w-full border p-3 rounded-xl" accept="image/*" required>
      <button class="w-full bg-slate-900 text-white py-4 rounded-xl font-bold">Upload & Post</button>
    </form></div>${manageList}</div></body></html>`);
});

// Add Product (POST)
app.post('/add-product', isAdmin, upload.single('itemImage'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("Please select an image.");
        await new Product({ 
          name: req.body.itemName, 
          price: req.body.itemPrice, 
          category: req.body.itemCategory, 
          image: req.file.path 
        }).save();
        res.redirect('/admin?pwd=' + MY_PASSWORD);
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).send("Upload Failed. Check Cloudinary settings. Error: " + err.message);
    }
});

// Delete Product (POST)
app.post('/delete-product', isAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.body.id);
    res.redirect('/admin?pwd=' + MY_PASSWORD);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => { console.log('🚀 WholesaleConnect running on port ' + PORT); }); 