"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ParticleBackground from "@/components/ui/particle-background"
import AnimatedText from "@/components/ui/animated-text"



interface ApiResponse {
  message: string;
}

export default function Home() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);


  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      console.error("API URL is missing. Please define NEXT_PUBLIC_API_URL.");
      return;
    }

    fetch(`${apiUrl}/api/data`)
      .then((res) => res.json())
      .then((data: ApiResponse) => setData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <div className="bg-gray-900 bg-home-img bg-cover bg-center min-h-screen">
      <nav className="bg-gray-800 text-white p-4 flex justify-between">
      <button
          onClick={() => setSidebarOpen(true)}
          className="text-white text-2xl focus:outline-none"
        >
          ☰
        </button>

        <Link href="/" className="text-lg font-bold">
          Smedex AI Assistant
        </Link>
        <input
          type="text"
          placeholder="Ask any medical Inquiry..."
          className="w-full max-w-xs px-1 py-1 rounded-md border border-gray-600 bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <ul className="flex space-x-10">
          <li>
            <Link href="/book" className="hover:underline">Book</Link>
          </li>
          <li>
            <Link href="/find" className="hover:underline">Find</Link>
          </li>
          <li>
            <Link href="/opd" className="hover:underline">Consult</Link>
          </li>
          <li>
            <Link href="/news" className="hover:underline">News</Link>
          </li>
          <li>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </li>
          <li>
            <Link href="/sign-in" className="hover:underline">Sign In</Link>
          </li>
        </ul>
      </nav>
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)} // Click outside to close
        ></div>
      )}

      {/* Sidebar (Profile Info) */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out z-50`}
      >
        {/* Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 text-white text-2xl"
        >
          ✕
        </button>

        {/* Profile Info */}
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Profile</h2>
          <p className="text-gray-300">Anany Sharma</p>
          <p className="text-gray-400 text-sm">anany.sharma@ufl.edu</p>

          <hr className="my-4 border-gray-600" />

          {/* Sidebar Navigation Links */}
          <ul>
            <li className="py-2">
              <Link href="/dashboard" className="hover:text-blue-400">
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
        <h1 className="text-6xl font-bold mb-2 text-white glow-text">Smedex AI Assistant</h1>
          <AnimatedText/>
          <Link
          href="/book"
          className="inline-block px-8 py-3 mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-xl font-semibold transition-all duration-300 ease-in-out hover:from-purple-500 hover:to-blue-500 hover:translate-y-[-4px] hover:shadow-lg hover:shadow-purple-500/25"
        >
          Get Started
        </Link>
        </div>
      </main>
            {/* What We Offer Section */}
            <section className="py-16 bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">What We Offer!</h2>

          {/* Cards Container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Book Appointment Card */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Book Appointment</h3>
              <p className="text-gray-400">Schedule your medical appointments hassle-free.</p>
              <Link href="/book" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>

            {/* Find Clinics/Doctors Card */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Find Clinics & Doctors</h3>
              <p className="text-gray-400">Locate trusted clinics and medical professionals near you.</p>
              <Link href="/find" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>

            {/* News & Updates Card */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Medical News & Updates</h3>
              <p className="text-gray-400">Stay informed with the latest health and medical updates.</p>
              <Link href="/news" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>

            {/* OPD Services Card */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Consultation Services</h3>
              <p className="text-gray-400">Get consultation medical support.</p>
              <Link href="/opd" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>

            {/* Emergency Support Card */}
            <div className="bg-gray-700 p-6 rounded-lg shadow-md hover:shadow-xl">
              <h3 className="text-xl font-semibold mb-2">Emergency Support</h3>
              <p className="text-gray-400">Find emergency medical services and immediate care.</p>
              <Link href="/emergency" className="text-blue-400 hover:underline mt-4 inline-block">Learn More →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section className="py-16 bg-gray-900 text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Contact Us</h2>
          <p className="text-gray-300 mb-6">Have any questions? Get in touch with us.</p>
          <Link href="/contact" className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-md text-white">
            Contact Now
          </Link>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-black text-gray-300 py-10 text-center">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          {/* Company Info */}
          <div>
            <h3 className="text-white text-xl font-semibold mb-3">Smedex AI</h3>
            <p>Your trusted medical assistant.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-xl font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/book" className="hover:text-blue-400">Book Appointment</Link></li>
              <li><Link href="/find" className="hover:text-blue-400">Find Clinics</Link></li>
              <li><Link href="/news" className="hover:text-blue-400">Medical News</Link></li>
              <li><Link href="/contact" className="hover:text-blue-400">Contact Us</Link></li>
            </ul>
          </div>

          {/* Social Media Links */}
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

        {/* Copyright */}
        <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Smedex AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
