import React, { useEffect, useState } from "react";
import { X, BookOpen, Clock, Globe } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";
import "./KnowledgeModal.css";

export default function KnowledgeModal({ isOpen, onClose }) {
  const [knowledge, setKnowledge] = useState({ policies: "", profiles: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(API_ENDPOINTS.KNOWLEDGE)
        .then((res) => res.json())
        .then((data) => {
          setKnowledge(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-container">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <BookOpen size={20} color="var(--cyan-accent)" />
            <h3 className="modal-title">
              RAG Knowledge Base & Policies
            </h3>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {loading ? (
            <div className="modal-loading">
              Loading RAG Documents...
            </div>
          ) : (
            <>
              {/* Attendee Profiles */}
              <div>
                <h4 className="modal-section-title profiles-title">
                  Attendee Preference Profiles
                </h4>
                <div className="profiles-grid">
                  {knowledge.profiles.map((profile, idx) => (
                    <div key={idx} className="profile-card">
                      <div className="profile-name">
                        {profile.name}
                      </div>
                      <div className="profile-role">
                        {profile.role}
                      </div>
                      <div className="profile-timezone">
                        <Globe size={14} /> {profile.timezone}
                      </div>
                      <div className="profile-hours">
                        <Clock size={14} /> {profile.workingHours}
                      </div>
                      <p className="profile-preferences">
                        "{profile.preferences}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Company Policies */}
              <div>
                <h4 className="modal-section-title policies-title">
                  Official Scheduling Policies
                </h4>
                <div className="policies-card">
                  {knowledge.policies}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
