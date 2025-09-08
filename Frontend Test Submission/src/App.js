import React, { useState, useEffect, createContext, useContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useParams,
  useNavigate,
  Link,
} from "react-router-dom";
import {
  Button,
  TextField,
  Typography,
  Container,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from "@mui/material";

////////////////////////////////////////////////////////////////////////////////
// api package
////////////////////////////////////////////////////////////////////////////////
const api = {
  LINKS_KEY: "links_v2",
  CLICKS_KEY: "clicks_v2",
  saveLinks(links) {
    localStorage.setItem(this.LINKS_KEY, JSON.stringify(links));
  },
  loadLinks() {
    return JSON.parse(localStorage.getItem(this.LINKS_KEY) || "{}");
  },
  saveClicks(clicks) {
    localStorage.setItem(this.CLICKS_KEY, JSON.stringify(clicks));
  },
  loadClicks() {
    return JSON.parse(localStorage.getItem(this.CLICKS_KEY) || "{}");
  },
  generateCode(existing) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    } while (existing[code]);
    return code;
  },
  isValidURL(url) {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  },
  nowPlusMinutes(mins) {
    return Date.now() + mins * 60000;
  },
};

////////////////////////////////////////////////////////////////////////////////
// state package (contexts)
////////////////////////////////////////////////////////////////////////////////
const UrlContext = createContext();
const LoggerContext = createContext();

////////////////////////////////////////////////////////////////////////////////
// hook package
////////////////////////////////////////////////////////////////////////////////
function useLogger() {
  return useContext(LoggerContext);
}
function useUrls() {
  return useContext(UrlContext);
}

////////////////////////////////////////////////////////////////////////////////
// component package
////////////////////////////////////////////////////////////////////////////////
function UrlForm() {
  const { links, addLink } = useUrls();
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [validity, setValidity] = useState(30); // minutes
  const logger = useLogger();

  const handleSubmit = () => {
    if (!api.isValidURL(url)) {
      logger.log("Invalid URL", { url });
      return;
    }

    let code = customCode || api.generateCode(links);
    if (links[code]) {
      logger.log("Code already exists", { code });
      return;
    }

    const entry = {
      code,
      url,
      createdAt: Date.now(),
      expiresAt: api.nowPlusMinutes(validity || 30),
    };
    addLink(entry);
    logger.log("Created short link", entry);
    setUrl("");
    setCustomCode("");
    setValidity(30);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <TextField
        label="Enter URL"
        fullWidth
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        sx={{ mb: 1 }}
      />
      <TextField
        label="Custom Code (optional)"
        fullWidth
        value={customCode}
        onChange={(e) => setCustomCode(e.target.value)}
        sx={{ mb: 1 }}
      />
      <TextField
        label="Validity (minutes)"
        type="number"
        fullWidth
        value={validity}
        onChange={(e) => setValidity(Number(e.target.value))}
        sx={{ mb: 1 }}
      />
      <Button onClick={handleSubmit} variant="contained">
        Shorten
      </Button>
    </div>
  );
}

function UrlList() {
  const { links, clicks } = useUrls();
  return (
    <Table component={Paper}>
      <TableHead>
        <TableRow>
          <TableCell>Code</TableCell>
          <TableCell>Original URL</TableCell>
          <TableCell>Clicks</TableCell>
          <TableCell>Expiry</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.values(links).map((l) => (
          <TableRow key={l.code}>
            <TableCell>
              <Link to={`/${l.code}`}>{l.code}</Link>
            </TableCell>
            <TableCell>{l.url}</TableCell>
            <TableCell>{clicks[l.code]?.length || 0}</TableCell>
            <TableCell>
              {new Date(l.expiresAt).toLocaleTimeString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

////////////////////////////////////////////////////////////////////////////////
// page package
////////////////////////////////////////////////////////////////////////////////
function CreatePage() {
  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 2 }}>
        URL Shortener
      </Typography>
      <UrlForm />
      <UrlList />
    </Container>
  );
}

function RedirectPage() {
  const { code } = useParams();
  const { links, addClick } = useUrls();
  const logger = useLogger();
  const navigate = useNavigate();

  useEffect(() => {
    const entry = links[code];
    if (!entry) {
      logger.log("Invalid redirect code", { code });
      navigate("/");
      return;
    }
    if (Date.now() > entry.expiresAt) {
      logger.log("Link expired", { code });
      navigate("/");
      return;
    }
    const click = {
      ts: Date.now(),
      ref: document.referrer || "direct",
    };
    addClick(code, click);
    logger.log("Redirect", { code, click });
    window.location.href = entry.url;
  }, [code, links, addClick, navigate, logger]);

  return <Typography>Redirecting...</Typography>;
}

function StatsPage() {
  const { clicks } = useUrls();
  return (
    <Container>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Stats
      </Typography>
      {Object.entries(clicks).map(([code, arr]) => (
        <Paper key={code} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">Code: {code}</Typography>
          <Typography>Total Clicks: {arr.length}</Typography>
          <ul>
            {arr.map((c, i) => (
              <li key={i}>
                {new Date(c.ts).toLocaleTimeString()} - Ref: {c.ref}
              </li>
            ))}
          </ul>
        </Paper>
      ))}
    </Container>
  );
}

////////////////////////////////////////////////////////////////////////////////
// style package (simple theme placeholder)
////////////////////////////////////////////////////////////////////////////////
const style = {
  app: { fontFamily: "sans-serif", padding: 20 },
};

////////////////////////////////////////////////////////////////////////////////
// root App
////////////////////////////////////////////////////////////////////////////////
export default function App() {
  const [links, setLinks] = useState(api.loadLinks());
  const [clicks, setClicks] = useState(api.loadClicks());
  const [logs, setLogs] = useState([]);

  const addLink = (entry) => {
    const newLinks = { ...links, [entry.code]: entry };
    setLinks(newLinks);
    api.saveLinks(newLinks);
  };
  const addClick = (code, click) => {
    const newClicks = { ...clicks, [code]: [...(clicks[code] || []), click] };
    setClicks(newClicks);
    api.saveClicks(newClicks);
  };

  const logger = {
    log: (msg, payload) => {
      const entry = { ts: Date.now(), msg, payload };
      setLogs((l) => [...l, entry]);
    },
    logs,
  };

  return (
    <LoggerContext.Provider value={logger}>
      <UrlContext.Provider value={{ links, clicks, addLink, addClick }}>
        <div style={style.app}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<CreatePage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/:code" element={<RedirectPage />} />
            </Routes>
          </BrowserRouter>
        </div>
      </UrlContext.Provider>
    </LoggerContext.Provider>
  );
}
