import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Building2, MapPin, Phone, Star, LogOut, Brain, TrendingUp, Wrench, Clock, AlertTriangle, CheckCircle, Calendar, Layers, ChevronDown, ChevronUp, Mail, User, Search, Plus, ExternalLink, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://4cc23kla34.execute-api.us-east-1.amazonaws.com/prod';
const GOOGLE_CSE_KEY = 'AIzaSyAeyv6UlP9Pw6k9nXRE3KDAge6EE4dbygg';
const GOOGLE_CSE_ID = '21ba7a2cd02dc4459';

const ProspectDetails = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [prospect, setProspect] = useState(null);
  const [tdlr, setTdlr] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tdlrExpanded, setTdlrExpanded] = useState(false);
  const [hunterLoading, setHunterLoading] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [linkedinResults, setLinkedinResults] = useState([]);
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [linkedinError, setLinkedinError] = useState(null);
  const [newContact, setNewContact] = useState({ first_name: '', last_name: '', email: '', title: '', phone: '', linkedin_url: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [hunterDomain, setHunterDomain] = useState('');
  const [hunterError, setHunterError] = useState(null);
  const [autoSearched, setAutoSearched] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [improvingProposal, setImprovingProposal] = useState(false);
  const [uploadedProposal, setUploadedProposal] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [contract, setContract] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractForm, setContractForm] = useState({ annual_value: '', monthly_value: '', start_date: '', term_months: '12', elevators_under_contract: '', service_frequency: 'monthly', notes: '' });
  const [savingContract, setSavingContract] = useState(false);
  const [introContent, setIntroContent] = useState('');
  const [introLoading, setIntroLoading] = useState(false);
  const [introEmail, setIntroEmail] = useState('');
  const [introName, setIntroName] = useState('');
  const [sendEmailTo, setSendEmailTo] = useState('');
  const [sendEmailName, setSendEmailName] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [noteMenuOpen, setNoteMenuOpen] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ date: '', time: '09:00', technician: '', notes: '' });
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('smartlift_token');
    const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    Promise.all([
      fetch(`${BASE_URL}/prospects/${id}`, { headers }).then(r => r.json()),
      fetch(`${BASE_URL}/prospects/${id}/tdlr`, { headers }).then(r => r.json()).catch(() => null),
      fetch(`${BASE_URL}/prospects/${id}/contacts`, { headers }).then(r => r.json()).catch(() => []),
      fetch(`${BASE_URL}/prospects/${id}/notes`, { headers }).then(r => r.json()).catch(() => []),
      fetch(`${BASE_URL}/prospects/${id}/contracts`, { headers }).then(r => r.json()).catch(() => null),
    ])
    .then(([p, t, c, n, ct]) => {
      setContract(ct);
      setNotes(Array.isArray(n) ? n : []);
      setProspect(p);
      setTdlr(t);
      setContacts(Array.isArray(c) ? c : []);

      if (p.website) {
        try { 
          const domain = new URL(p.website).hostname.replace('www.', '');
          setHunterDomain(domain);
        } catch {}
      } else if (p.name) {
        // Try to guess domain from known brands
        const knownDomains = {
          'hyatt': 'hyatt.com', 'marriott': 'marriott.com', 'hilton': 'hilton.com',
          'westin': 'marriott.com', 'sheraton': 'marriott.com', 'omni': 'omnihotels.com',
          'four seasons': 'fourseasons.com', 'intercontinental': 'ihg.com',
          'holiday inn': 'ihg.com', 'doubletree': 'hilton.com', 'courtyard': 'marriott.com',
          'hampton inn': 'hilton.com', 'best western': 'bestwestern.com',
          'drury': 'druryhotels.com', 'at&t': 'att.com', 'methodist': 'methodisthealth.com',
          'st. david': 'stdavids.com', 'baylor': 'bswhealth.com',
        };
        const nameLower = p.name.toLowerCase();
        for (const [key, val] of Object.entries(knownDomains)) {
          if (nameLower.includes(key)) { setHunterDomain(val); break; }
        }
      }
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [id]);

  // Auto-search Hunter when page loads if no contacts saved
  useEffect(() => {
    if (loading || contacts.length > 0 || !prospect) return;
    
    let domain = null;
    if (prospect.website) {
      try { domain = new URL(prospect.website).hostname.replace('www.', ''); } catch {}
    }
    if (!domain) {
      const knownDomains = {
        'hyatt': 'hyatt.com', 'marriott': 'marriott.com', 'hilton': 'hilton.com',
        'westin': 'marriott.com', 'sheraton': 'marriott.com', 'omni': 'omnihotels.com',
        'four seasons': 'fourseasons.com', 'jw marriott': 'marriott.com',
        'renaissance': 'marriott.com', 'intercontinental': 'ihg.com',
        'aloft': 'marriott.com', 'thompson': 'hyatt.com', 'w austin': 'marriott.com',
        'hampton inn': 'hilton.com', 'comfort inn': 'choicehotels.com',
        'hyatt regency': 'hyatt.com', 'marriott marquis': 'marriott.com',
        'holiday inn': 'ihg.com', 'doubletree': 'hilton.com', 'courtyard': 'marriott.com',
        'fairfield': 'marriott.com', 'homewood': 'hilton.com', 'tru by hilton': 'hilton.com',
        'best western': 'bestwestern.com', 'country inn': 'radissonhotels.com',
      };
      const nameLower = prospect.name.toLowerCase();
      for (const [key, val] of Object.entries(knownDomains)) {
        if (nameLower.includes(key)) { domain = val; break; }
      }
    }
    if (domain) {
      setHunterDomain(domain);
      // Auto trigger search
      const autoSearch = async () => {
        setHunterLoading(true);
        try {
          const token = localStorage.getItem('smartlift_token');
      const res = await fetch(`${BASE_URL}/prospects/${prospect.id}/hunter?domain=${domain}`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) }
      });
          const data = await res.json();
          if (!data.data?.emails?.length) return;
          const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
          const saved = [];
          for (const email of data.data.emails) {
            try {
              const r = await fetch(`${BASE_URL}/prospects/${prospect.id}/contacts`, {
                method: 'POST', headers,
                body: JSON.stringify({ first_name: email.first_name, last_name: email.last_name, email: email.value, title: email.position, linkedin_url: email.linkedin, confidence: email.confidence, source: 'hunter' })
              });
              if (r.ok) saved.push(await r.json());
            } catch {}
          }
          if (saved.length) setContacts(saved);
        } catch {}
        finally { setHunterLoading(false); }
      };
      autoSearch();
    }
  }, [loading, prospect]);

  const searchHunter = async () => {
    if (!hunterDomain) return;
    setHunterLoading(true);
    setHunterError(null);
    try {
      const token2 = localStorage.getItem('smartlift_token');
      const res = await fetch(`${BASE_URL}/prospects/${prospect.id}/hunter?domain=${hunterDomain}`, {
        headers: { ...(token2 && { Authorization: `Bearer ${token2}` }) }
      });
      const data = await res.json();
      if (data.errors) { setHunterError(data.errors[0]?.details || 'Hunter.io error'); return; }

      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };

      const newContacts = [];
      for (const email of (data.data?.emails || [])) {
        try {
          const r = await fetch(`${BASE_URL}/prospects/${id}/contacts`, {
            method: 'POST', headers,
            body: JSON.stringify({
              first_name: email.first_name,
              last_name: email.last_name,
              email: email.value,
              title: email.position,
              linkedin_url: email.linkedin,
              confidence: email.confidence,
              source: 'hunter'
            })
          });
          const saved = await r.json();
          newContacts.push(saved);
        } catch {}
      }
      setContacts(prev => {
        const existing = prev.map(c => c.email);
        const fresh = newContacts.filter(c => !existing.includes(c.email));
        return [...prev, ...fresh];
      });
      if (newContacts.length === 0) setHunterError('No contacts found for this domain.');
    } catch (e) {
      setHunterError('Failed to search Hunter.io: ' + e.message);
    } finally {
      setHunterLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setNotesSaving(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${BASE_URL}/prospects/${id}/notes`, {
        method: 'POST', headers,
        body: JSON.stringify({ content: newNote, created_by: user?.email || 'Staff' })
      });
      const saved = await res.json();
      setNotes(prev => [saved, ...prev]);
      setNewNote('');
    } catch (e) {
      alert('Failed to save note: ' + e.message);
    } finally {
      setNotesSaving(false);
    }
  };

  const saveEdit = async (noteId) => {
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${BASE_URL}/prospects/${id}/notes/${noteId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ content: editContent })
      });
      const updated = await res.json();
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
      setEditingNote(null);
    } catch (e) {
      alert('Failed to update note: ' + e.message);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      await fetch(`${BASE_URL}/prospects/${id}/notes/${noteId}`, { method: 'DELETE', headers });
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (e) {
      alert('Failed to delete note: ' + e.message);
    }
    setNoteMenuOpen(null);
  };

  const updateStatus = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      await fetch(`${BASE_URL}/prospects/${id}/status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: newStatus })
      });
      setProspect(prev => ({ ...prev, status: newStatus }));
    } catch (e) {
      alert('Failed to update status: ' + e.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const submitSchedule = async () => {
    setScheduleLoading(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      await fetch(`${BASE_URL}/tickets`, {
        method: 'POST', headers,
        body: JSON.stringify({
          title: `Site Visit — ${prospect.name}`,
          description: `Scheduled site visit to ${prospect.name} at ${prospect.address}.\nDate: ${scheduleForm.date} at ${scheduleForm.time}\nTechnician: ${scheduleForm.technician || 'TBD'}\nNotes: ${scheduleForm.notes || 'None'}`,
          priority: prospect.service_urgency === 'high' ? 'high' : 'medium',
          assigned_technician: scheduleForm.technician || null,
          scheduled_date: scheduleForm.date ? new Date(scheduleForm.date + 'T' + scheduleForm.time).toISOString() : null,
        })
      });
      setScheduleSuccess(true);
      setTimeout(() => { setShowSchedule(false); setScheduleSuccess(false); }, 2000);
    } catch (e) {
      alert('Failed to schedule: ' + e.message);
    } finally {
      setScheduleLoading(false);
    }
  };

  const sendProposalEmail = () => {
    if (!sendEmailTo.trim()) return;
    const subject = encodeURIComponent(`Elevator Service Proposal — ${prospect.name}`);
    // Convert markdown to plain text for email
    const plainText = (proposal || '').split('\n').map(line => {
      if (line.startsWith('## ')) return '\n' + line.replace('## ', '').toUpperCase() + '\n' + '-'.repeat(40);
      if (line.startsWith('# ')) return '\n' + line.replace('# ', '').toUpperCase() + '\n' + '='.repeat(40);
      if (line.startsWith('- ')) return '  • ' + line.replace('- ', '');
      return line;
    }).join('\n');
    const body = encodeURIComponent(plainText);
    const mailtoUrl = `mailto:${sendEmailTo}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    setShowSendEmail(false);
  };

  const saveContract = async () => {
    setSavingContract(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const annual = contractForm.annual_value || (contractForm.monthly_value ? contractForm.monthly_value * 12 : 0);
      const monthly = contractForm.monthly_value || (contractForm.annual_value ? contractForm.annual_value / 12 : 0);
      const res = await fetch(`${BASE_URL}/contracts`, {
        method: 'POST', headers,
        body: JSON.stringify({
          prospect_id: id,
          company_name: prospect.name,
          ...contractForm,
          annual_value: annual,
          monthly_value: monthly,
        })
      });
      const saved = await res.json();
      setContract(saved);
      setShowContractForm(false);
    } catch (e) {
      alert('Failed to save contract: ' + e.message);
    } finally {
      setSavingContract(false);
    }
  };

  const searchLinkedIn = async () => {
    if (!prospect?.name) return;
    setLinkedinLoading(true);
    setLinkedinError(null);
    setLinkedinResults([]);
    try {
      const token = localStorage.getItem('smartlift_token');
      const res = await fetch(`${BASE_URL}/prospects/${prospect.id}/people-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ company_name: prospect.name })
      });
      const data = await res.json();
      if (!data.results?.length) { setLinkedinError('No contacts found for this company.'); return; }
      setLinkedinResults(data.results);
    } catch(e) {
      setLinkedinError('Search failed: ' + e.message);
    } finally {
      setLinkedinLoading(false);
    }
  };

  const [companyEnrichment, setCompanyEnrichment] = useState(null);
  const [enrichingCompany, setEnrichingCompany] = useState(false);

  const enrichCompany = async () => {
    setEnrichingCompany(true);
    try {
      const ecToken = localStorage.getItem('smartlift_token');
      const res = await fetch(`${BASE_URL}/prospects/${prospect.id}/enrich-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(ecToken && { Authorization: `Bearer ${ecToken}` }) },
        body: JSON.stringify({ company_name: prospect.name, domain: prospect.website ? new URL(prospect.website.startsWith('http') ? prospect.website : 'https://' + prospect.website).hostname : null })
      });
      const data = await res.json();
      if (data.found) setCompanyEnrichment(data);
      else setCompanyEnrichment({ found: false });
    } catch(e) { console.error(e); }
    finally { setEnrichingCompany(false); }
  };

  const enrichPerson = async (linkedinUrl, email, resultIndex) => {
    const epToken = localStorage.getItem('smartlift_token');
    try {
      const res = await fetch(`${BASE_URL}/prospects/${prospect.id}/enrich-person`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(epToken && { Authorization: `Bearer ${epToken}` }) },
        body: JSON.stringify({ linkedin_url: linkedinUrl, email })
      });
      const data = await res.json();
      if (data.found) {
        setLinkedinResults(prev => prev.map((r, i) => i === resultIndex ? { ...r, phone: data.phone, email: data.email || r.email, enriched: true } : r));
      }
    } catch(e) { console.error(e); }
  };

  const saveManualContact = async () => {
    if (!newContact.email && !newContact.first_name) return;
    setSavingContact(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const r = await fetch(`${BASE_URL}/prospects/${id}/contacts`, {
        method: 'POST', headers,
        body: JSON.stringify({ ...newContact, source: 'manual', confidence: 100 })
      });
      const saved = await r.json();
      setContacts(prev => [...prev, saved]);
      setNewContact({ first_name: '', last_name: '', email: '', title: '', phone: '', linkedin_url: '' });
      setShowAddContact(false);
    } catch (e) { alert('Failed to save contact: ' + e.message); }
    finally { setSavingContact(false); }
  };

  const deleteContact = async (contactId) => {
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      await fetch(`${BASE_URL}/prospects/${id}/contacts/${contactId}`, { method: 'DELETE', headers });
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (e) { alert('Failed to delete contact'); }
  };

  const generateIntro = async () => {
    setIntroLoading(true);
    setShowIntro(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${BASE_URL}/prospects/${id}/intro-email`, { method: 'POST', headers });
      const data = await res.json();
      setIntroContent(data.content);
      // Pre-fill email from first contact
      if (contacts.length > 0 && !introEmail) {
        setIntroEmail(contacts[0].email || '');
        setIntroName(`${contacts[0].first_name || ''} ${contacts[0].last_name || ''}`.trim());
      }
    } catch (e) {
      setIntroContent('Failed to generate: ' + e.message);
    } finally {
      setIntroLoading(false);
    }
  };

  const sendIntroEmail = () => {
    if (!introEmail.trim()) return;
    // Extract subject from content
    const subjectMatch = introContent.match(/Subject:\s*(.+)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Introduction — ${prospect.name}`;
    const body = introContent.replace(/Subject:.+\n/, '').trim();
    const mailtoUrl = `mailto:${introEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const printProposal = () => {
    const printWindow = window.open('', '_blank');
    const content = proposal || '';
    const html = content.split('\n').map(line => {
      if (line.startsWith('## ')) return `<h2>${line.replace('## ', '')}</h2>`;
      if (line.startsWith('# ')) return `<h1>${line.replace('# ', '')}</h1>`;
      if (line.startsWith('- ')) return `<li>${line.replace('- ', '')}</li>`;
      if (line.trim() === '') return '<br/>';
      return `<p>${line}</p>`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proposal — ${prospect.name}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
          h1 { color: #4B0082; border-bottom: 2px solid #4B0082; padding-bottom: 10px; }
          h2 { color: #1D4ED8; margin-top: 24px; }
          p { margin: 8px 0; }
          li { margin: 4px 0; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const improveProposal = async () => {
    if (!uploadedProposal.trim()) return;
    setImprovingProposal(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${BASE_URL}/prospects/${id}/improve-proposal`, {
        method: 'POST', headers,
        body: JSON.stringify({ content: uploadedProposal })
      });
      const data = await res.json();
      setProposal(data.content);
      setShowUpload(false);
      setShowProposal(true);
    } catch (e) {
      alert('Failed to improve proposal: ' + e.message);
    } finally {
      setImprovingProposal(false);
    }
  };

  const generateProposal = async () => {
    setProposalLoading(true);
    setShowProposal(true);
    try {
      const token = localStorage.getItem('smartlift_token');
      const headers = { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
      const res = await fetch(`${BASE_URL}/prospects/${id}/proposal`, { method: 'POST', headers });
      const data = await res.json();
      setProposal(data.content);
    } catch (e) {
      setProposal('## Error Generating Proposal\n\n' + e.message + '\n\nThis is usually because Amazon Bedrock model access is still pending approval. The nightly AI scorer will automatically generate proposals once access is granted.');
    } finally {
      setProposalLoading(false);
    }
  };

  const formatProposal = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h3 key={i} className="text-purple-400 font-bold text-lg mt-6 mb-2">{line.replace('## ', '')}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} className="text-white font-bold text-xl mt-6 mb-2">{line.replace('# ', '')}</h2>;
      if (line.startsWith('- ')) return <li key={i} className="text-gray-300 text-sm ml-4 mb-1 list-disc">{line.replace('- ', '')}</li>;
      if (line.trim() === '') return <div key={i} className="mb-2" />;
      return <p key={i} className="text-gray-300 text-sm mb-2 leading-relaxed">{line}</p>;
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center"><Brain className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-pulse" /><p className="text-white text-lg">Loading prospect intelligence...</p></div>
    </div>
  );

  if (error || !prospect) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center"><AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p className="text-white text-lg">{error || 'Prospect not found'}</p><Link to="/internal/leads" className="mt-4 inline-block text-purple-400 hover:text-purple-300">← Back to Leads</Link></div>
    </div>
  );

  const scoreColor = (s) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-amber-400' : 'text-red-400';
  const scoreBar = (s, max = 100) => (
    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-300" style={{ width: `${Math.min((s / max) * 100, 100)}%` }} />
    </div>
  );

  const urgencyColor = { high: 'bg-red-500/20 text-red-400 border-red-500/30', medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30', low: 'bg-green-500/20 text-green-400 border-green-500/30' };
  const annualPotential = prospect.estimated_elevators ? prospect.estimated_elevators * 8000 : null;
  const hasTdlr = tdlr && parseInt(tdlr.summary?.total_elevators) > 0;
  const certExpired = tdlr?.summary?.expired_certs > 0;
  const lastInspection = tdlr?.summary?.last_inspection ? new Date(tdlr.summary.last_inspection) : null;
  const certExpiry = tdlr?.summary?.cert_expiry ? new Date(tdlr.summary.cert_expiry) : null;
  const daysSinceInspection = lastInspection ? Math.floor((new Date() - lastInspection) / (1000 * 60 * 60 * 24)) : null;
  const daysUntilExpiry = certExpiry ? Math.floor((certExpiry - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const groupedByType = tdlr?.elevators?.reduce((acc, e) => {
    const type = e.equipment_type || 'UNKNOWN';
    if (!acc[type]) acc[type] = [];
    acc[type].push(e);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/internal/leads"><Building2 className="w-8 h-8 text-purple-400" /></Link>
              <div><h1 className="text-xl font-bold text-white">Prospect Intelligence</h1><p className="text-xs text-gray-400">{user?.email}</p></div>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/internal/leads" className="text-purple-400 hover:text-purple-300 text-sm mb-6 inline-flex items-center gap-1">← Back to Lead Search</Link>

        {/* Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-600/30"><Building2 className="w-10 h-10 text-purple-400" /></div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{prospect.name}</h2>
                <div className="flex items-center gap-2 text-gray-400 mb-2"><MapPin className="w-4 h-4" />{prospect.address || `${prospect.city}, ${prospect.state}`}</div>
                {prospect.rating && <div className="flex items-center gap-2 mb-3"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="text-white font-medium">{prospect.rating}</span><span className="text-gray-400">({prospect.total_reviews?.toLocaleString()} reviews)</span></div>}
                <div className="flex gap-2 flex-wrap">
                  {prospect.service_urgency && <span className={`px-3 py-1 rounded-full text-sm border ${urgencyColor[prospect.service_urgency]}`}>{prospect.service_urgency} urgency</span>}
                  {prospect.modernization_candidate && <span className="px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30">Modernization Candidate</span>}
                  {certExpired && <span className="px-3 py-1 rounded-full text-sm bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Expired Certs</span>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-400 text-sm">Status:</span>
                    <select
                      value={prospect.status || 'new'}
                      onChange={e => updateStatus(e.target.value)}
                      disabled={statusUpdating}
                      className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50">
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="proposal_sent">Proposal Sent</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                    </select>
                    {statusUpdating && <span className="text-gray-400 text-xs">Saving...</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center bg-gray-700/50 rounded-xl p-4 border border-gray-600">
              <p className="text-gray-400 text-sm mb-1">Lead Score</p>
              <p className={`text-5xl font-bold ${scoreColor(prospect.lead_score)}`}>{prospect.lead_score || 'N/A'}</p>
              <p className="text-gray-500 text-xs mt-1">out of 100</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Layers className="w-5 h-5 text-purple-400" />Building Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Elevators', prospect.estimated_elevators || tdlr?.summary?.total_elevators || 'N/A'],
                ['Floors', prospect.estimated_floors || 'N/A'],
                ['Building Age', prospect.building_age ? `${prospect.building_age} yrs` : 'N/A'],
                ['Annual Value', annualPotential ? `$${annualPotential.toLocaleString()}` : 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-700/50 rounded-lg p-3 text-center">
                  <p className="text-gray-400 text-xs">{label}</p>
                  <p className="text-white font-bold text-lg">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" />AI Analysis</h3>
            {prospect.ai_summary ? (
              <>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">{prospect.ai_summary}</p>
                <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-3">
                  <p className="text-purple-400 text-xs font-medium mb-1">RECOMMENDATION</p>
                  <p className="text-gray-300 text-sm">{prospect.ai_recommendation}</p>
                </div>
              </>
            ) : <p className="text-gray-500 text-sm">AI analysis pending — will be scored in next nightly run.</p>}
          </div>
        </div>

        {/* Review Intelligence Section */}
        {prospect.review_intelligence && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />Review Intelligence
                <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs font-normal">AI Analyzed</span>
              </h3>
              {prospect.review_intelligence.opportunity_score > 0 && (
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                  prospect.review_intelligence.opportunity_score >= 70 ? 'bg-red-900/30 text-red-400 border border-red-700/30' :
                  prospect.review_intelligence.opportunity_score >= 40 ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30' :
                  'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                  Opportunity: {prospect.review_intelligence.opportunity_score}/100
                </div>
              )}
            </div>

            {/* Sales Angle */}
            {prospect.review_intelligence.sales_angle && (
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4 mb-4">
                <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide mb-1">Sales Angle</p>
                <p className="text-gray-200 text-sm leading-relaxed">{prospect.review_intelligence.sales_angle}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Elevator Complaints */}
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Elevator Complaints</p>
                <p className={`text-xl font-bold ${prospect.review_intelligence.elevator_complaints > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {prospect.review_intelligence.elevator_complaints || 0}
                </p>
                <p className="text-gray-500 text-xs">mentions in reviews</p>
              </div>

              {/* Management Quality */}
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Management Quality</p>
                <p className={`text-sm font-semibold capitalize ${
                  prospect.review_intelligence.management_quality === 'poor' ? 'text-red-400' :
                  prospect.review_intelligence.management_quality === 'fair' ? 'text-yellow-400' :
                  prospect.review_intelligence.management_quality === 'good' ? 'text-blue-400' : 'text-green-400'}`}>
                  {prospect.review_intelligence.management_quality || 'Unknown'}
                </p>
                <p className="text-gray-500 text-xs">based on review responses</p>
              </div>
            </div>

            {/* Complaint Details */}
            {prospect.review_intelligence.complaint_details?.length > 0 && prospect.review_intelligence.complaint_details[0] !== '<complaint>' && (
              <div className="mt-4">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Complaint Details</p>
                <div className="space-y-1">
                  {prospect.review_intelligence.complaint_details.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <p className="text-gray-300 text-sm">{c}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Urgency Signals */}
            {prospect.review_intelligence.urgency_signals?.length > 0 && prospect.review_intelligence.urgency_signals[0] !== '<signals>' && (
              <div className="mt-4">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Urgency Signals</p>
                <div className="flex flex-wrap gap-2">
                  {prospect.review_intelligence.urgency_signals.map((s, i) => (
                    <span key={i} className="px-2 py-1 bg-orange-900/20 text-orange-400 border border-orange-700/30 rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance Signals */}
            {prospect.review_intelligence.maintenance_signals?.length > 0 && (
              <div className="mt-4">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Maintenance Signals</p>
                <div className="flex flex-wrap gap-2">
                  {prospect.review_intelligence.maintenance_signals.map((s, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-900/20 text-blue-400 border border-blue-700/30 rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TDLR Section */}
        {hasTdlr && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />TDLR Inspection Records
                <span className="ml-1 px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs">Live Data</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="bg-gray-700/50 rounded-xl p-4 text-center border border-gray-600">
                <p className="text-gray-400 text-xs mb-1">Registered Units</p>
                <p className="text-white font-bold text-3xl">{tdlr.summary.total_elevators}</p>
              </div>
              <div className="bg-gray-700/50 rounded-xl p-4 text-center border border-gray-600">
                <p className="text-gray-400 text-xs mb-1">Equipment Breakdown</p>
                <p className="text-white font-bold text-lg">{tdlr.summary.passenger} pass / {tdlr.summary.freight} freight</p>
              </div>
              <div className={`rounded-xl p-4 text-center border ${daysSinceInspection > 300 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-gray-700/50 border-gray-600'}`}>
                <p className="text-gray-400 text-xs mb-1">Last Inspection</p>
                <p className={`font-bold text-lg ${daysSinceInspection > 300 ? 'text-amber-400' : 'text-white'}`}>{lastInspection ? lastInspection.toLocaleDateString() : '—'}</p>
                {daysSinceInspection && <p className="text-gray-500 text-xs mt-0.5">{daysSinceInspection} days ago</p>}
              </div>
              <div className={`rounded-xl p-4 text-center border ${certExpired ? 'bg-red-500/10 border-red-500/30' : daysUntilExpiry < 60 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                <p className="text-gray-400 text-xs mb-1">Cert Expiry</p>
                <p className={`font-bold text-lg ${certExpired ? 'text-red-400' : daysUntilExpiry < 60 ? 'text-amber-400' : 'text-green-400'}`}>{certExpiry ? certExpiry.toLocaleDateString() : '—'}</p>
                {daysUntilExpiry !== null && <p className="text-gray-500 text-xs mt-0.5">{certExpired ? 'EXPIRED' : `${daysUntilExpiry} days remaining`}</p>}
              </div>
            </div>
            {groupedByType && (
              <div className="flex gap-3 mb-5 flex-wrap">
                {Object.entries(groupedByType).map(([type, units]) => (
                  <div key={type} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-4 py-2 border border-gray-600">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span className="text-gray-300 text-sm font-medium">{type}</span>
                    <span className="text-white font-bold">{units.length}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setTdlrExpanded(!tdlrExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg border border-gray-600 transition-colors">
              <span className="text-white text-sm font-medium">View All {tdlr.elevators.length} Inspection Records</span>
              {tdlrExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {tdlrExpanded && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-700/50 text-gray-400 text-xs">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Drive</th>
                    <th className="text-left px-4 py-3">Floors</th>
                    <th className="text-left px-4 py-3">Installed</th>
                    <th className="text-left px-4 py-3">Last Inspection</th>
                    <th className="text-left px-4 py-3">Cert Expiry</th>
                  </tr></thead>
                  <tbody>{tdlr.elevators.map((e, i) => {
                    const expired = e.expiration && new Date(e.expiration) < new Date();
                    return (
                      <tr key={i} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-gray-300">{e.equipment_type}</td>
                        <td className="px-4 py-2.5 text-gray-400">{e.drive_type}</td>
                        <td className="px-4 py-2.5 text-gray-300">{e.floors || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400">{e.year_installed || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-300">{e.most_recent_inspection ? new Date(e.most_recent_inspection).toLocaleDateString() : '—'}</td>
                        <td className={`px-4 py-2.5 font-medium ${expired ? 'text-red-400' : 'text-green-400'}`}>{e.expiration ? new Date(e.expiration).toLocaleDateString() : '—'}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Contacts Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />Contact Intelligence
            <span className="ml-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs">Hunter.io</span>
          </h3>

          {/* Domain Search */}
          <div className="flex gap-3 mb-5">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input type="text" value={hunterDomain} onChange={e => setHunterDomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchHunter()}
                placeholder={prospect.website ? new URL(prospect.website).hostname.replace("www.","") + " (auto-filled)" : "e.g. marriott.com, hilton.com, omnihotels.com"}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm" />
            </div>
            <button onClick={searchHunter} disabled={hunterLoading || !hunterDomain || contacts.length > 0}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center gap-2">
              <Search className="w-4 h-4" />{hunterLoading ? 'Searching...' : contacts.length > 0 ? 'Already Searched' : 'Find Contacts'}
            </button>
          </div>
          <p className="text-gray-500 text-xs mb-3">
            {contacts.length > 0 
              ? <span className="text-green-500">✓ Contacts loaded from cache — no Hunter.io credit used</span> 
              : <span className="text-amber-400">Uses 1 Hunter.io credit · Enter the company website domain (e.g. marriott.com, hilton.com)</span>}
          </p>

          {hunterError && <p className="text-red-400 text-sm mb-4">{hunterError}</p>}

          {/* Manual Add Contact */}
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddContact(!showAddContact)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />Add Manually
            </button>
          </div>

          {showAddContact && (
            <div className="bg-gray-700/50 rounded-lg p-4 mb-4 border border-gray-600">
              <p className="text-gray-300 text-sm font-medium mb-3">Add Contact Manually</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input type="text" placeholder="First Name" value={newContact.first_name}
                  onChange={e => setNewContact(p => ({...p, first_name: e.target.value}))}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                <input type="text" placeholder="Last Name" value={newContact.last_name}
                  onChange={e => setNewContact(p => ({...p, last_name: e.target.value}))}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                <input type="email" placeholder="Email Address" value={newContact.email}
                  onChange={e => setNewContact(p => ({...p, email: e.target.value}))}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                <input type="text" placeholder="Job Title" value={newContact.title}
                  onChange={e => setNewContact(p => ({...p, title: e.target.value}))}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                <input type="text" placeholder="Phone Number" value={newContact.phone}
                  onChange={e => setNewContact(p => ({...p, phone: e.target.value}))}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                <input type="text" placeholder="LinkedIn URL" value={newContact.linkedin_url}
                  onChange={e => setNewContact(p => ({...p, linkedin_url: e.target.value}))}
                  className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddContact(false)}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={saveManualContact} disabled={savingContact}
                  className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
                  {savingContact ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </div>
          )}

          {contacts.length > 0 ? (
            <div className="space-y-3">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600/20 rounded-full border border-purple-600/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{c.first_name || ''} {c.last_name || ''}</p>
                      {c.title && <p className="text-gray-400 text-sm">{c.title}</p>}
                      {c.email && <p className="text-purple-400 text-sm">{c.email}</p>}
                      {c.phone && <p className="text-blue-400 text-sm">{c.phone}</p>}
                      {c.source === 'manual' && <span className="text-xs px-1.5 py-0.5 bg-gray-600 text-gray-400 rounded">Manual</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.confidence && (
                      <div className="text-center">
                        <p className="text-gray-500 text-xs">Confidence</p>
                        <p className={`font-bold text-sm ${c.confidence >= 80 ? 'text-green-400' : c.confidence >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{c.confidence}%</p>
                      </div>
                    )}
                    <a href={`mailto:${c.email}`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />Email
                    </a>
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />LinkedIn
                      </a>
                    )}
                    <button onClick={() => deleteContact(c.id)}
                      className="px-2 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-gray-600 rounded-lg">
              <User className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No contacts yet — search by company domain above</p>
              <p className="text-gray-500 text-xs mt-1">Powered by Hunter.io</p>
            </div>
          )}
        </div>

        {/* Company Enrichment */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />Company Intelligence
              <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 rounded text-xs font-normal">People Data Labs</span>
            </h3>
            <button onClick={enrichCompany} disabled={enrichingCompany}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2">
              <Search className="w-4 h-4" />{enrichingCompany ? 'Enriching...' : 'Enrich Company'}
            </button>
          </div>
          {companyEnrichment === null && (
            <div className="text-center py-4 border border-dashed border-gray-600 rounded-lg">
              <p className="text-gray-400 text-sm">Get company details — employee count, industry, LinkedIn, founded year</p>
            </div>
          )}
          {companyEnrichment?.found === false && <p className="text-amber-400 text-sm">No company data found in People Data Labs.</p>}
          {companyEnrichment?.found && (
            <div className="grid grid-cols-2 gap-3">
              {companyEnrichment.employee_count && <div className="bg-gray-700/50 rounded-lg p-3"><p className="text-gray-400 text-xs">Employees</p><p className="text-white font-medium">{companyEnrichment.employee_count.toLocaleString()}</p></div>}
              {companyEnrichment.industry && <div className="bg-gray-700/50 rounded-lg p-3"><p className="text-gray-400 text-xs">Industry</p><p className="text-white font-medium capitalize">{companyEnrichment.industry}</p></div>}
              {companyEnrichment.founded && <div className="bg-gray-700/50 rounded-lg p-3"><p className="text-gray-400 text-xs">Founded</p><p className="text-white font-medium">{companyEnrichment.founded}</p></div>}
              {companyEnrichment.location && <div className="bg-gray-700/50 rounded-lg p-3"><p className="text-gray-400 text-xs">HQ Location</p><p className="text-white font-medium">{companyEnrichment.location}</p></div>}
              {companyEnrichment.linkedin_url && <div className="bg-gray-700/50 rounded-lg p-3 col-span-2"><p className="text-gray-400 text-xs">LinkedIn</p><a href={companyEnrichment.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-400 text-sm hover:underline">{companyEnrichment.linkedin_url}</a></div>}
            </div>
          )}
        </div>

        {/* People Intelligence */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />People Intelligence
              <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs font-normal">People Data Labs</span>
            </h3>
            <button onClick={searchLinkedIn} disabled={linkedinLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2">
              <Search className="w-4 h-4" />{linkedinLoading ? 'Searching...' : 'Find Decision Makers'}
            </button>
          </div>

          {linkedinError && <p className="text-amber-400 text-sm mb-3">{linkedinError}</p>}

          {linkedinResults.length > 0 ? (
            <div className="space-y-3">
              {linkedinResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-full border border-blue-600/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{r.name}</p>
                      {r.title && <p className="text-gray-400 text-sm">{r.title}</p>}
                      {r.location && <p className="text-gray-500 text-xs">{r.location}</p>}
                      {r.email && <p className="text-purple-400 text-sm">{r.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.email && (
                      <a href={`mailto:${r.email}`} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />Email
                      </a>
                    )}
                    {r.linkedin_url && (
                      <a href={r.linkedin_url} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />LinkedIn
                      </a>
                    )}
                    {(r.linkedin_url || r.email) && !r.enriched && (
                      <button onClick={() => enrichPerson(r.linkedin_url, r.email, i)}
                        className="px-2 py-1.5 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 rounded-lg text-xs">Enrich</button>
                    )}
                    {r.enriched && <span className="px-2 py-1.5 text-green-400 text-xs">✓ Enriched</span>}
                    {r.phone && <span className="text-gray-300 text-xs">{r.phone}</span>}
                    <button onClick={() => {
                      setNewContact({ first_name: r.name.split(' ')[0] || '', last_name: r.name.split(' ').slice(1).join(' ') || '', email: r.email || '', title: r.title || '', phone: r.phone || '', linkedin_url: r.linkedin_url || '' });
                      setShowAddContact(true);
                    }} className="px-2 py-1.5 bg-green-900/30 hover:bg-green-900/50 text-green-400 rounded-lg text-xs">+ Save</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border border-dashed border-gray-600 rounded-lg">
              <p className="text-gray-400 text-sm">Find decision makers at this company</p>
              <p className="text-gray-500 text-xs mt-1">Returns names, titles, LinkedIn profiles, and emails where available</p>
            </div>
          )}
        </div>

                {/* Contract Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-400" />Service Contract
            </h3>
            <button onClick={() => { setShowContractForm(!showContractForm); if (contract) setContractForm({ annual_value: contract.annual_value || '', monthly_value: contract.monthly_value || '', start_date: contract.start_date?.split('T')[0] || '', term_months: contract.term_months || '12', elevators_under_contract: contract.elevators_under_contract || '', service_frequency: contract.service_frequency || 'monthly', notes: contract.notes || '' }); }}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-1.5">
              {contract ? 'Edit Contract' : '+ Add Contract'}
            </button>
          </div>

          {contract && !showContractForm && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Annual Value</p>
                <p className="text-green-400 font-bold text-xl">${parseFloat(contract.annual_value || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Monthly Value</p>
                <p className="text-white font-bold text-xl">${parseFloat(contract.monthly_value || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Elevators</p>
                <p className="text-purple-400 font-bold text-xl">{contract.elevators_under_contract || 'N/A'}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Start Date</p>
                <p className="text-white text-sm">{contract.start_date ? new Date(contract.start_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">End Date</p>
                <p className="text-white text-sm">{contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-gray-400 text-xs mb-1">Service Frequency</p>
                <p className="text-white text-sm capitalize">{contract.service_frequency || 'N/A'}</p>
              </div>
              {contract.notes && (
                <div className="col-span-2 md:col-span-3 bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Notes</p>
                  <p className="text-gray-300 text-sm">{contract.notes}</p>
                </div>
              )}
            </div>
          )}

          {!contract && !showContractForm && (
            <div className="text-center py-6 border border-dashed border-gray-600 rounded-lg">
              <p className="text-gray-400 text-sm">No contract recorded yet</p>
              <p className="text-gray-500 text-xs mt-1">Add contract details when a deal is closed</p>
            </div>
          )}

          {showContractForm && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Annual Value ($)</label>
                  <input type="number" value={contractForm.annual_value}
                    onChange={e => setContractForm(p => ({...p, annual_value: e.target.value, monthly_value: e.target.value ? (e.target.value/12).toFixed(2) : ''}))}
                    placeholder="32000"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Monthly Value ($)</label>
                  <input type="number" value={contractForm.monthly_value}
                    onChange={e => setContractForm(p => ({...p, monthly_value: e.target.value, annual_value: e.target.value ? (e.target.value*12).toFixed(2) : ''}))}
                    placeholder="2667"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Start Date</label>
                  <input type="date" value={contractForm.start_date}
                    onChange={e => setContractForm(p => ({...p, start_date: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Term (months)</label>
                  <select value={contractForm.term_months}
                    onChange={e => setContractForm(p => ({...p, term_months: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500">
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Elevators Under Contract</label>
                  <input type="number" value={contractForm.elevators_under_contract}
                    onChange={e => setContractForm(p => ({...p, elevators_under_contract: e.target.value}))}
                    placeholder="4"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Service Frequency</label>
                  <select value={contractForm.service_frequency}
                    onChange={e => setContractForm(p => ({...p, service_frequency: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="biannual">Bi-Annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea value={contractForm.notes}
                  onChange={e => setContractForm(p => ({...p, notes: e.target.value}))}
                  placeholder="Special terms, scope details..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-green-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowContractForm(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
                <button onClick={saveContract} disabled={savingContract}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium">
                  {savingContract ? 'Saving...' : 'Save Contract'}
                </button>
              </div>
            </div>
          )}
        </div>

                {/* Notes Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />Staff Notes
            <span className="ml-1 px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">{notes.length}</span>
          </h3>

          {/* Add note input */}
          <div className="flex gap-3 mb-5">
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.metaKey && addNote()}
              placeholder="Add a note — conversations, observations, follow-up reminders... (Cmd+Enter to save)"
              rows={2}
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm resize-none"
            />
            <button onClick={addNote} disabled={notesSaving || !newNote.trim()}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium self-end">
              {notesSaving ? '...' : 'Add'}
            </button>
          </div>

          {/* Notes list */}
          <div className="space-y-3">
            {notes.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No notes yet — add the first one above</p>
            )}
            {notes.map(note => (
              <div key={note.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                {editingNote === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(note.id)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs">Save</button>
                      <button onClick={() => setEditingNote(null)} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-gray-300 text-sm leading-relaxed">{note.content}</p>
                      <p className="text-gray-500 text-xs mt-2">{note.created_by} · {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setNoteMenuOpen(noteMenuOpen === note.id ? null : note.id)}
                        className="text-gray-500 hover:text-white p-1 rounded">
                        ⋮
                      </button>
                      {noteMenuOpen === note.id && (
                        <div className="absolute right-0 top-6 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 w-32">
                          <button onClick={() => { setEditingNote(note.id); setEditContent(note.content); setNoteMenuOpen(null); }}
                            className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-700 text-sm rounded-t-lg">Edit</button>
                          <button onClick={() => deleteNote(note.id)}
                            className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 text-sm rounded-b-lg">Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scores + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" />Intelligence Scores</h3>
            {[
              ['Lead Score', prospect.lead_score, 100, prospect.lead_score],
              ['Sentiment Score', prospect.sentiment_score, 10, prospect.sentiment_score ? prospect.sentiment_score * 10 : null],
              ['Reputation Score', prospect.reputation_score, 10, prospect.reputation_score ? prospect.reputation_score * 10 : null],
            ].map(([label, raw, max, barVal]) => (
              <div key={label} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className={`font-bold ${scoreColor(barVal)}`}>{raw ? (label === 'Lead Score' ? raw : parseFloat(raw).toFixed(1)) : 'N/A'}</span>
                </div>
                {barVal && scoreBar(barVal, 100)}
              </div>
            ))}
            {prospect.common_issues && (
              <div className="mt-4">
                <p className="text-gray-400 text-sm mb-2">Common Issues</p>
                <div className="flex gap-2 flex-wrap">
                  {(typeof prospect.common_issues === 'string' ? JSON.parse(prospect.common_issues) : prospect.common_issues).map((issue, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">{issue}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-purple-400" />Contact & Actions</h3>
            {prospect.phone && <p className="text-gray-400 text-sm mb-1">Phone: <span className="text-white">{prospect.phone}</span></p>}
            {prospect.website && <p className="text-gray-400 text-sm mb-4">Website: <a href={prospect.website} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">{prospect.website}</a></p>}
            <div className="space-y-3 mt-4">
              {prospect.phone && <a href={`tel:${prospect.phone}`} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"><Phone className="w-4 h-4" />Call Now</a>}
              <button onClick={() => setShowSchedule(true)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"><Clock className="w-4 h-4" />Schedule Visit</button>
              <button onClick={generateIntro} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"><Mail className="w-4 h-4" />Send Introduction Email</button>
              <button onClick={generateProposal} disabled={proposalLoading} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 font-medium"><Brain className="w-4 h-4" />{proposalLoading ? "Generating..." : "Generate Proposal"}</button>
            </div>
          </div>
        </div>
      </div>
      {/* Schedule Visit Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" />Schedule Site Visit</h2>
              <button onClick={() => setShowSchedule(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {scheduleSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-bold text-lg">Visit Scheduled!</p>
                  <p className="text-gray-400 text-sm mt-1">Service ticket created successfully</p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Building</p>
                    <p className="text-white font-medium">{prospect.name}</p>
                    <p className="text-gray-500 text-sm">{prospect.address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Date</label>
                      <input type="date" value={scheduleForm.date}
                        onChange={e => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Time</label>
                      <select value={scheduleForm.time}
                        onChange={e => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm">
                        {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Technician (optional)</label>
                    <input type="text" value={scheduleForm.technician}
                      onChange={e => setScheduleForm(prev => ({ ...prev, technician: e.target.value }))}
                      placeholder="Assign a technician..."
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Notes (optional)</label>
                    <textarea value={scheduleForm.notes}
                      onChange={e => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Any notes for the visit..."
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm resize-none" />
                  </div>
                  <button onClick={submitSchedule} disabled={scheduleLoading || !scheduleForm.date}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />{scheduleLoading ? 'Scheduling...' : 'Confirm Visit'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intro Email Modal */}
      {showIntro && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-400" />Introduction Email</h2>
                <p className="text-indigo-400 text-sm mt-0.5">{prospect.name} — {prospect.city}, {prospect.state}</p>
              </div>
              <button onClick={() => setShowIntro(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {introLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Brain className="w-12 h-12 text-indigo-400 animate-pulse mb-4" />
                  <p className="text-white text-lg mb-2">Generating introduction email...</p>
                  <p className="text-gray-400 text-sm">Personalizing based on company profile and completed projects</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-900 rounded-lg p-4 mb-4 text-sm text-gray-300 whitespace-pre-wrap font-mono border border-gray-700">{introContent}</div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Recipient Name</label>
                        <input type="text" value={introName} onChange={e => setIntroName(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs mb-1 block">Email Address</label>
                        <input type="email" value={introEmail} onChange={e => setIntroEmail(e.target.value)}
                          placeholder="contact@company.com"
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>
                    {contacts.length > 0 && (
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Saved contacts:</p>
                        <div className="flex gap-2 flex-wrap">
                          {contacts.map(c => (
                            <button key={c.id} onClick={() => { setIntroEmail(c.email); setIntroName(`${c.first_name || ''} ${c.last_name || ''}`.trim()); }}
                              className={`px-3 py-1 rounded-lg text-xs transition-colors ${introEmail === c.email ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-600/30' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                              {c.first_name} {c.last_name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button onClick={() => navigator.clipboard.writeText(introContent)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Copy</button>
                      <button onClick={sendIntroEmail} disabled={!introEmail.trim()}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white rounded-lg text-sm flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4" />Open in Email App
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showSendEmail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Mail className="w-5 h-5 text-green-400" />Send Proposal</h2>
              <button onClick={() => setShowSendEmail(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {emailSent ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-bold text-lg">Proposal Sent!</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Recipient Name (optional)</label>
                    <input type="text" value={sendEmailName} onChange={e => setSendEmailName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Email Address</label>
                    <input type="email" value={sendEmailTo} onChange={e => setSendEmailTo(e.target.value)}
                      placeholder="prospect@company.com"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-sm" />
                  </div>
                  {contacts.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Or select a saved contact:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {contacts.map(c => (
                          <button key={c.id} onClick={() => { setSendEmailTo(c.email); setSendEmailName(`${c.first_name || ''} ${c.last_name || ''}`.trim()); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${sendEmailTo === c.email ? 'bg-green-600/20 border border-green-600/30 text-green-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                            {c.first_name} {c.last_name} — {c.email}
                            {c.title && <span className="text-gray-500 ml-1">({c.title})</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={sendProposalEmail} disabled={!sendEmailTo.trim()}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />Open in Email App
                  </button>
                  <p className="text-gray-500 text-xs text-center">Opens your default email app pre-filled with the proposal</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload & Improve Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" />Upload & Improve Proposal</h2>
                <p className="text-gray-400 text-sm mt-1">Paste your existing proposal and AI will enhance it</p>
              </div>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={uploadedProposal}
                onChange={e => setUploadedProposal(e.target.value)}
                placeholder="Paste your existing proposal here..."
                rows={12}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm resize-none"
              />
              <div className="flex gap-3">
                <button onClick={improveProposal} disabled={improvingProposal || !uploadedProposal.trim()}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
                  <Brain className="w-4 h-4" />{improvingProposal ? 'Improving...' : 'Improve with AI'}
                </button>
                <button onClick={() => setShowUpload(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposal Modal */}
      {showProposal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" />AI-Generated Proposal</h2>
                <p className="text-purple-400 text-sm mt-0.5">{prospect.name} — {prospect.city}, {prospect.state}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {proposal && (
                  <>
                    <button onClick={() => navigator.clipboard.writeText(proposal)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                      Copy
                    </button>
                    <button onClick={printProposal}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
                      Download PDF
                    </button>
                    <button onClick={() => setShowSendEmail(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
                      Send Email
                    </button>
                  </>
                )}
                <button onClick={() => { setShowUpload(true); setShowProposal(false); }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm">
                  Upload & Improve
                </button>
                <button onClick={() => setShowProposal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {proposalLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Brain className="w-12 h-12 text-purple-400 animate-pulse mb-4" />
                  <p className="text-white text-lg mb-2">Generating proposal...</p>
                  <p className="text-gray-400 text-sm">Analyzing prospect data and crafting personalized proposal</p>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  {formatProposal(proposal)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectDetails;
