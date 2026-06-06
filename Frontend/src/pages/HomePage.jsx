import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { FiChevronLeft, FiChevronRight, FiArrowRight } from "react-icons/fi";
import { productAPI } from "../services/api";

const heroSlides = [
  {
    title: "Newly Added Handmade Products",
    subtitle: "Discover unique artisan creations",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1800&auto=format&fit=crop",
  },
  {
    title: "Exclusive Gold Festive Offers",
    subtitle: "Up to 40% off on selected items",
    img: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=1800&auto=format&fit=crop",
  },
  {
    title: "Traditional Crafts Modern Style",
    subtitle: "Curated by skilled Indian artisans",
    img: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1800&auto=format&fit=crop",
  },
];

const categories = [
  {
    name: "Handmade Clothes",
    desc: "Traditional handwoven garments and textiles",
    image: "https://i.pinimg.com/1200x/17/54/86/175486d42ecb05b0c22acb93d7376cef.jpg",
  },
  {
    name: "Accessories",
    desc: "Artisan jewelry, bags and accessories",
    image: "https://i.pinimg.com/736x/5f/da/54/5fda547c66f85840a1e2069cd90b1ebb.jpg",
  },
  {
    name: "Pots",
    desc: "Handcrafted ceramic and clay pottery",
    image: "https://i.pinimg.com/1200x/3a/f2/39/3af2395d88e41eca20b478608dd42a43.jpg",
  },
  {
    name: "Home Decor",
    desc: "Unique handmade home decor items",
    image: "https://i.pinimg.com/736x/b4/d8/7b/b4d87b723cf69df0c356075495cbbfa1.jpg",
  },
  {
    name: "Handmade Snacks",
    desc: "Artisanal food and treats",
    image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=700",
  },
];

const HomePage = () => {
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState(null);
  const [slide, setSlide] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  const loadAllProducts = async () => {
    try {
      const response = await productAPI.getAll();
      setAllProducts(response.data || []);
    } catch (error) {
      console.error("Failed to load products:", error);
      setAllProducts([]);
    }
  };

  const loadCats = async () => {
    try {
      const res = await productAPI.getCategories();
      setCategoriesList(res.data || []);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  useEffect(() => {
    loadAllProducts();
    loadCats();

    const handleStorageUpdate = () => {
      loadAllProducts();
      loadCats();
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("sellerProductsUpdated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("sellerProductsUpdated", handleStorageUpdate);
    };
  }, []);

  const dynamicCategories = useMemo(() => {
  const defaults = [
    "Handmade Clothes",
    "Home Decor",
    "Accessories",
    "Snacks",
    "Crafts",
  ];

  const categoryImageMap = {
    "Handmade Clothes":
      "https://images.unsplash.com/photo-1617694820985-a5476fe22722?q=80&w=1200&auto=format&fit=crop",
    "Home Decor":
      "https://i.pinimg.com/736x/b4/d8/7b/b4d87b723cf69df0c356075495cbbfa1.jpg",
    Accessories:
      "https://i.pinimg.com/736x/5f/da/54/5fda547c66f85840a1e2069cd90b1ebb.jpg",
    Snacks:
      "https://i.pinimg.com/736x/f8/a5/fc/f8a5fcd2a863720603805088837cddbf.jpg",
    Crafts:
      "https://i.pinimg.com/736x/25/25/46/252546b22dc052348e29614ab1e039c6.jpg",
    "Handmade Foods":
      "https://i.pinimg.com/1200x/95/a7/fc/95a7fc582625d9c6449fd3c04781a89a.jpg",
    Pots:
      "https://i.pinimg.com/1200x/3a/f2/39/3af2395d88e41eca20b478608dd42a43.jpg",
    Footwears:
      "https://i.pinimg.com/736x/92/95/55/9295557d43f8c875d2d59e1e527f8460.jpg",
  };

  const merged = Array.from(new Set([...defaults, ...categoriesList]));

  return merged.map((catName) => {
    const existingCategory = categories.find(
      (cat) => cat.name.toLowerCase() === catName.toLowerCase()
    );

    const categoryProduct = allProducts.find(
      (product) => product.category?.toLowerCase() === catName.toLowerCase()
    );

    return {
      name: catName,
      desc:
        existingCategory?.desc ||
        `Explore handmade ${catName.toLowerCase()} products`,
      image:
        categoryImageMap[catName] ||
        existingCategory?.image ||
        categoryProduct?.images?.[0] ||
        categoryProduct?.media?.find((m) => m.type?.startsWith("image"))?.url ||
        "/placeholder-product.svg",
    };
  });
}, [categoriesList, allProducts]);

  const nextSlide = () => {
    setSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="animate-fadeIn">
      <section className="hero-section">
        <div
          className="hero-container"
          style={{ backgroundImage: `url(${heroSlides[slide].img})` }}
        >
          <button className="hero-left-arrow" onClick={prevSlide}>
            <FiChevronLeft size={34} />
          </button>

          <div className="hero-content">
            <h1 className="hero-title">{heroSlides[slide].title}</h1>
            <p className="hero-subtitle">{heroSlides[slide].subtitle}</p>

            <Link to="/products" className="btn-gold hero-btn">
              Shop Now <FiArrowRight />
            </Link>
          </div>

          <button className="hero-right-arrow" onClick={nextSlide}>
            <FiChevronRight size={34} />
          </button>

          <div className="hero-dots">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={`hero-dot ${i === slide ? "active" : ""}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="categories" className="page-wrap">
        <div className="section-header">
          <h2 className="section-title">Elite Collections</h2>
          <p className="section-subtitle">
            Discover unique handcrafted treasures
          </p>
        </div>

        <div className="category-grid">
          {dynamicCategories.map((cat) => (
            <Link
              key={cat.name}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="category-card"
            >
             <img src={cat.image || "/placeholder-product.svg"}
  alt={cat.name}
  onError={(e) => {
    e.currentTarget.src = "/placeholder-product.svg";
  }}
/>
              <div className="category-info">
                <h3>{cat.name}</h3>
                <p>{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-wrap pt-0">
        <div className="section-header flex items-center justify-between">
          <div>
            <h2 className="section-title">Trending Now</h2>
            <p className="section-subtitle">
              Handpicked artisan creations just for you
            </p>
          </div>

          <Link to="/products" className="view-all-link">
            View All <FiArrowRight />
          </Link>
        </div>

        <div className="product-grid">
          {allProducts.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>

      <section className="page-wrap pt-0">
        <h2 className="why-title">Why Choose Heritcraft</h2>

        <div className="why-grid">
          {[
            [
              "Authentic Craftsmanship",
              "Every product is handmade by skilled artisans with years of experience.",
            ],
            [
              "Premium Quality",
              "We ensure the highest quality standards for all our products.",
            ],
            [
              "Fast Delivery",
              "Quick and secure delivery to your doorstep across the country.",
            ],
          ].map((item) => (
            <div key={item[0]} className="panel text-center">
              <h3>{item[0]}</h3>
              <p>{item[1]}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="chatbot-wrapper">
        {chatOpen && (
          <div className="chatbot-box">
            <div className="chatbot-header">
              <div>
                <h3>HeritCraft AI Assistant</h3>
                <p>Quick help for users</p>
              </div>

              <button onClick={() => setChatOpen(false)}>×</button>
            </div>

            <div className="chatbot-body">
              {[
                {
                  q: "How to buy a product?",
                  a: "Open any product, choose quantity, click Buy Now, fill address and place order.",
                },
                {
                  q: "How to add item to cart?",
                  a: "Click the Add button on any product. You can increase or decrease quantity in cart.",
                },
                {
                  q: "How to track my order?",
                  a: "Login and go to Buyer Dashboard → Orders → Track Order.",
                },
                {
                  q: "Can seller also buy products?",
                  a: "Yes. Sellers can also purchase products like normal buyers.",
                },
                {
                  q: "How to become a seller?",
                  a: "Register as seller and upload products from Seller Dashboard.",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className={`faq-card ${
                    selectedFAQ === index ? "faq-card-active" : ""
                  }`}
                >
                  <button
                    className="faq-question"
                    onClick={() =>
                      setSelectedFAQ(selectedFAQ === index ? null : index)
                    }
                  >
                    <div className="faq-question-left">
                      <span className="faq-q-badge">Q</span>
                      <span className="faq-question-text">{item.q}</span>
                    </div>

                    <span className="faq-toggle">
                      {selectedFAQ === index ? "−" : "+"}
                    </span>
                  </button>

                  {selectedFAQ === index && (
                    <div className="faq-answer">
                      <span className="faq-answer-badge">Solution</span>
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          className={`chatbot-button ${chatOpen ? "active" : ""}`}
          onClick={() => setChatOpen(!chatOpen)}
        >
          <img
            src="https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
            alt="AI Bot"
            className="chatbot-robot-icon"
          />

          <span className="chatbot-tooltip">Need Help?</span>
          <span className="chatbot-ping"></span>
        </button>
      </div>
    </div>
  );
};

export default HomePage;
