import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <h2 className="footer-brand">HERITCRAFT</h2>
          <p className="mt-3 max-w-xl">Supporting artisans and preserving traditional crafts for future generations.</p>
        </div>

        <div>
          <h3 className="text-white font-bold mb-4">Quick Links</h3>
          <div className="space-y-2">
            <Link to="/" className="block">Home</Link>
            <Link to="/products" className="block">Categories</Link>
            <Link to="/buyer" className="block">Buyer Dashboard</Link>
          </div>
        </div>

        <div>
          <h3 className="text-white font-bold mb-4">Support</h3>
          <p>Help Center</p>
          <p>Contact Us</p>
          <p>Returns</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
