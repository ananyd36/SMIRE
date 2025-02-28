"use client";

import { useState } from "react";
import Link from "next/link";
import ParticleBackground from "@/components/ui/particle-background"
import AnimatedText from "@/components/ui/animated-text"
import ReactMarkdown from "react-markdown";




interface ApiResponse {
  message: string;
}

export default function Home() {
  const [query, setQuery] = useState(""); 
  const [response, setResponse] = useState<string | null>(null); 
  const [loading, setLoading] = useState(false); 
  const [showModal, setShowModal] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleSubmit = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && query.trim() !== "") {
      setLoading(true);
      setResponse(null); 
      setShowModal(true); 

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${apiUrl}/get-consultation?question=${query}`);
        const data = await res.json();
        if (data.status === "success") {
          setResponse(data.answer);
        } else {
          setResponse("Failed to fetch consultation.");
        }
      } catch (err) {
        setResponse("Error fetching data.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-gray-900 bg-home-img bg-cover bg-center min-h-screen">
<nav className="bg-gray-800 text-white p-3 flex items-center justify-between">
  <div className="flex items-center gap-x-10 w-1/3">
    <button onClick={() => setSidebarOpen(true)} className="text-white text-2xl focus:outline-none">
      ☰
    </button>

    <Link href="/" className="text-lg w-1/1 font-bold">
      SMIRE AI
    </Link>

      <input
        type="text"
        placeholder="Ask any medical inquiry..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleSubmit} 
        className="flex-1 px-3 py-2 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-semibold">Consultation Response</h2>
            {loading ? (
              <p className="mt-4">Loading...</p>
            ) : (
                    response && (
                  <div className="mt-6 max-w-2xl bg-gray-800 p-6 rounded-md shadow-md">
                    <h3 className="text-lg font-semibold mb-2">Initial Diagnosis:</h3>
                    
                    <div className="prose prose-invert max-h-64 overflow-y-auto whitespace-pre-wrap">
                      <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                  </div>
                )
            )}

            {/* Close Button */}
            <button onClick={() => {
              setShowModal(false); 
              setQuery("");
              } } 
              className="mt-4 px-4 py-2 bg-blue-500 hover:bg-red-600 rounded-md">
              Close
            </button>
          </div>
        </div>
      )}
  </div>

  <ul className="flex items-center gap-x-6 w-1/3 justify-between pr-8" >
    <li><Link href="/book" className="text-lg font-bold hover:underline">Book</Link></li>
    <li><Link href="/find" className="text-lg font-bold hover:underline">Search</Link></li>
    <li><Link href="/opd" className="text-lg font-bold hover:underline">Consult</Link></li>
    <li><Link href="/news" className="text-lg font-bold hover:underline">News</Link></li>
    <li><Link href="/manage" className="text-lg font-bold hover:underline">Manage</Link></li>

  </ul>
</nav>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)} 
        ></div>
      )}


      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out z-50`}
      >
        
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-white text-2xl"
        >
          ✕
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Profile</h2>
          <p className="text-gray-300">Anany Sharma</p>
          <p className="text-gray-400 text-sm">anany.sharma@ufl.edu</p>

          <hr className="my-4 border-gray-600" />

          <ul>
            <li className="py-2">
              <Link href="/" className="hover:text-blue-400">
                Dashboard
              </Link>
            </li>
            <li className="py-2">
              <Link href="/settings" className="hover:text-blue-400">
                Settings
              </Link>
            </li>
            <li className="py-2">
              <Link href="/logout" className="hover:text-blue-400">
                Logout
              </Link>
            </li>
          </ul>
        </div>
      </aside>
      <main className="flex flex-col justify-center text-center max-w-5xl mx-auto min-h-screen">
      <div >
      <ParticleBackground />
        <h1 className="text-6xl font-bold mb-2 text-white glow-text">SMIRE AI</h1>
          <AnimatedText/>
          <Link
          href="/book"
          className="inline-block px-8 py-3 mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-xl font-semibold transition-all duration-300 ease-in-out hover:from-purple-500 hover:to-blue-500 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-purple-500/25"
        >
          Get Started
        </Link>
        </div>
      </main>
            <section className="min-h-screen py-16 bg-gray-800 text-white flex items-center justify-center">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">What We Offer!</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Book Appointment</h3>
              <p className="text-gray-400">Schedule your medical appointments hassle-free.</p>
              <Link href="/book" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Find Clinics & Doctors</h3>
              <p className="text-gray-400">Locate trusted clinics and medical professionals near you.</p>
              <Link href="/find" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Medical News & Updates</h3>
              <p className="text-gray-400">Stay informed with the latest health and medical updates.</p>
              <Link href="/news" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Consultation Services</h3>
              <p className="text-gray-400">Get consultation medical support.</p>
              <Link href="/opd" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Emergency Support</h3>
              <p className="text-gray-400">Find emergency medical services and immediate care.</p>
              <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Contact Us</h3>
              <p className="text-gray-400">Contact us for our Services.</p>
              <Link href="/contact" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-black text-gray-300 py-10 text-center">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          <div>
            <h3 className="text-white text-xl font-semibold mb-3">SMIRE AI</h3>
            <p>Your trusted medical assistant.</p>
          </div>

          <div>
            <h3 className="text-white text-xl font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/book" className="hover:text-blue-400">Book Appointment</Link></li>
              <li><Link href="/find" className="hover:text-blue-400">Find Clinics</Link></li>
              <li><Link href="/news" className="hover:text-blue-400">Medical News</Link></li>
              <li><Link href="/contact" className="hover:text-blue-400">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-xl font-semibold mb-3">Follow Us</h3>
            <ul className="flex space-x-4">
              <li><Link href="#" className="hover:text-blue-400">Facebook</Link></li>
              <li><Link href="#" className="hover:text-blue-400">Twitter</Link></li>
              <li><Link href="#" className="hover:text-blue-400">LinkedIn</Link></li>
            </ul>
          </div>
        </div>

        <hr className="my-6 border-gray-700" />

        <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Smedex AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
