'use client'
import { useState } from 'react';
import data from '@/public/data.json';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  stock: number;
  image_url: string;
  rating: number;
  reviews: number;
  tags: string[];
}

export default function Home() {
  const [allProducts] = useState<Product[]>(data); // keep original data
  const [productData, setProductData] = useState<Product[]>(data);
  const [searchText, setSearchText] = useState("");

  const debounce = (fn: (...args: any[]) => void, delay: number) => {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        fn(...args);
      }, delay);
    };
  };

  const searchBy = (text: string) => {
    const filtered = allProducts.filter(item =>
      item.name.toLowerCase().includes(text.toLowerCase())
    );
    setProductData(filtered);
  };

  const searchDebounce = debounce(searchBy, 300);

  const handleSearch = (searchItem: string) => {
    setSearchText(searchItem);
    searchDebounce(searchItem); // pass search text directly
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1>Hello World</h1>
      <input
        type="text"
        className="border p-2"
        placeholder="Search products..."
        value={searchText}
        onChange={(e) => handleSearch(e.currentTarget.value)}
      />
      <ul>
        {productData.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
