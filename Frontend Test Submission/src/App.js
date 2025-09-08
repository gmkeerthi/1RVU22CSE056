import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, Link } from "react-router-dom";

function App() {
  const [links, setLinks] = useState(() => JSON.parse(localStorage.getItem("links") || "{}"));
  const [clicks, setClicks] = useState(() => JSON.parse(localStorage.getItem("clicks") || "{}"));

  useEffect(() => {
    localStorage.setItem("links", JSON.stringify(links));
  }, [links]);
  useEffect(() => {
    localStorage.setItem("clicks", JSON.stringify(clicks));
  }, [clicks]);

  const generateCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    } while (links[code]);
    return code;
  };

  const addLink = (url, validity, custom) => {
    if (!url.startsWith("http")) {
      alert("Invalid URL");
      return;
    }
    const code = custom || generateCode();
    if (links[code]) {
      alert("Code already exists!");
      return;
    }
    const entry = {
      url,
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + (validity || 30) * 60000,
    };
    setLinks({ ...links, [code]: entry });
  };

  const addClick = (code) => {
    const c = { ts: Date.now(), ref: document.referrer || "direct" };
    setClicks({ ...clicks, [code]: [...(clicks[code] || []), c] });
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreatePage links={links} addLink={addLink} clicks={clicks} />} />
        <Route path="/stats" element={<StatsPage clicks={clicks} />} />
        <Route path="/:code" element={<RedirectPage links={links} addClick={addClick} />} />
      </Routes>
    </BrowserRouter>
  );
}

function CreatePage({ links, addLink, clicks }) {
  const [url, setUrl] = useState("");
  const [custom, setCustom] = useState("");
  const [validity, setValidity] = useState(30);

  const handleAdd = () => {
    addLink(url, validity, custom);
    setUrl("");
    setCustom("");
    setValidity(30);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>URL Shortener</h2>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter URL" />
      <br />
      <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom code (optional)" />
      <br />
      <input
        type="number"
        value={validity}
        onChange={(e) => setValidity(Number(e.target.value))}
        placeholder="Validity in minutes"
      />
      <br />
      <button onClick={handleAdd}>Shorten</button>

      <h3>All Links</h3>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>Code</th>
            <th>URL</th>
            <th>Clicks</th>
            <th>Expiry</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(links).map((l) => (
            <tr key={l.code}>
              <td><Link to={`/${l.code}`}>{l.code}</Link></td>
              <td>{l.url}</td>
              <td>{clicks[l.code]?.length || 0}</td>
              <td>{new Date(l.expiresAt).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p><Link to="/stats">View Stats</Link></p>
    </div>
  );
}

function RedirectPage({ links, addClick }) {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const entry = links[code];
    if (!entry) {
      alert("Invalid code!");
      navigate("/");
      return;
    }
    if (Date.now() > entry.expiresAt) {
      alert("Link expired!");
      navigate("/");
      return;
    }
    addClick(code);
    window.location.href = entry.url;
  }, [code, links, addClick, navigate]);

  return <p>Redirecting...</p>;
}

function StatsPage({ clicks }) {
  return (
    <div style={{ padding: 20 }}>
      <h2>Stats</h2>
      {Object.entries(clicks).map(([code, arr]) => (
        <div key={code} style={{ marginBottom: 20 }}>
          <h3>Code: {code}</h3>
          <p>Total Clicks: {arr.length}</p>
          <ul>
            {arr.map((c, i) => (
              <li key={i}>{new Date(c.ts).toLocaleTimeString()} - Ref: {c.ref}</li>
            ))}
          </ul>
        </div>
      ))}
      <p><Link to="/">Back</Link></p>
    </div>
  );
}

export default App;
