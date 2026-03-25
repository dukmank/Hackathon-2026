import * as React from "react"
import { useRef } from "react"
import "./Navbar.css"
import logo from "../images/sample_logo.webp"

export default function Navbar() {
    const logoRef = useRef(null);

    const handleLogoClick = () => {
      if (!logoRef.current) return;

      const rect = logoRef.current.getBoundingClientRect();

      const origin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      localStorage.setItem("warpOrigin", JSON.stringify(origin));
    };
    return (
        <nav className="navbar">
            <div className="logo">
                <a href="/" onClick={handleLogoClick}>
                    <img
                      ref={logoRef}
                      src={logo}
                      alt="Superhero Matchmaker Logo"
                      className="logo-image"
                    />
                </a>
            </div>
            <div className="nav-links">
 
            </div>
        </nav>
    );
}