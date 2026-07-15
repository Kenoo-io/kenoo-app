"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState, useEffect, useRef, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FALLBACK_ICON_URL } from "@/lib/asset-urls";
import { createClient } from '@supabase/supabase-js';
import { Input } from "@/components/ui/input";
import Editor, { EditorRef, normalizeEmailHtmlForSend } from '@/components/agentCRM/emailComposer/components/editor/editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Toolbar } from "./toolbar";
import Image from "next/image";
import { transformToGmailFormat, prepareForEditor } from "@/utils/composition-formatting";
import { TestSendTool } from "@/components/agentCRM/emailComposer/components/editor/tools/testSend";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TestTube } from "lucide-react";
import { EmailContentViewer } from "@/components/agentMail/email-content-viewer";
import { SpintaxText } from "./spintax-text";
import { useDebounce } from "@/hooks/use-debounce";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface EmailTemplateEditorProps {
  stepJoinId: string;
  sequenceId: string;
  stepSlug?: string | null;
  stepId?: string | null;
  onChange?: (hasChanges: boolean) => void;
  getEditorRefs?: () => { [key: string]: EmailTemplateEditorRef | null };
}

export interface EmailTemplateEditorRef {
  save: () => Promise<void>;
  hasChanges: boolean;
  getSubject: () => string;
  /** Called by the initial email editor when its subject changes; follow-up editors use this to stay in sync */
  syncSubject: (newOriginalSubject: string) => void;
}

interface SequenceContact {
  id: string;
  person_id: string;
  sender_id: string;
  person?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    photo_url: string | null;
    company_name: string | null;
    title: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    headline: string | null;
    seniority: string | null;
    linkedin_url: string | null;
    twitter_url: string | null;
    github_url: string | null;
    facebook_url: string | null;
    company_id: string | null;
  };
  company?: {
    name: string | null;
    domain: string | null;
    website: string | null;
    phone: string | null;
    employee_count: number | null;
    industry: string | null;
    founding_year: number | null;
    annual_revenue: number | null;
    city: string | null;
    country: string | null;
    address: string | null;
    overview: string | null;
  };
  /** Custom fields from sequence_people_fields (for {{custom.*}} template variables, same as backend) */
  custom_fields?: Record<string, string | null>;
}

interface MessageTemplate {
  id: string;
  subject: string | null;
  html: string | null;
  text: string | null;
}

const AUTO_FOLLOW_UP_STEP_ID = '663b6577-8256-419a-8888-f4fab2c16928'; // Follow-up email step

export const EmailTemplateEditor = forwardRef<EmailTemplateEditorRef, EmailTemplateEditorProps>(
  ({ stepJoinId, sequenceId, stepSlug, stepId, onChange, getEditorRefs }, ref) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [currentEditorContent, setCurrentEditorContent] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<SequenceContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [senderUser, setSenderUser] = useState<{ first_name: string | null; last_name: string | null; email: string | null; phone_number: string | null } | null>(null);
  const [senderTeam, setSenderTeam] = useState<{ title: string | null; phone_extension: string | null } | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [stablePreviewContent, setStablePreviewContent] = useState('');
  const [stablePreviewSubject, setStablePreviewSubject] = useState('');
  const [initialSubject, setInitialSubject] = useState('');
  const [initialHtmlContent, setInitialHtmlContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isThreadedReply, setIsThreadedReply] = useState(true); // Default to true (Reply)
  const [testSending, setTestSending] = useState(false);
  const editorRef = useRef<EditorRef>(null);
  const { handleTestSend } = TestSendTool();

  const isFollowUpStep = stepId === AUTO_FOLLOW_UP_STEP_ID;

  const onTestSend = async () => {
    const content = editorRef.current?.getEditor()?.getHTML() || '';
    const normalized = normalizeEmailHtmlForSend(content);
    const gmailContent = transformToGmailFormat(normalized);
    setTestSending(true);
    try {
      await handleTestSend({
        subject,
        content: gmailContent,
      });
    } finally {
      setTestSending(false);
    }
  };

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!stepJoinId) return;

      try {
        setLoading(true);
        
        // Fetch is_threaded_reply for follow-up steps FIRST (needed for subject logic)
        let currentIsThreadedReply = true; // Default to true
        if (isFollowUpStep) {
          const { data: stepJoin, error: stepJoinError } = await supabase
            .from('sequence_steps_join')
            .select('is_threaded_reply')
            .eq('id', stepJoinId)
            .maybeSingle();
          
          if (!stepJoinError && stepJoin) {
            currentIsThreadedReply = stepJoin.is_threaded_reply ?? true; // Default to true if null
            setIsThreadedReply(currentIsThreadedReply);
          }
        }
        
        // Fetch existing template
        const { data: template, error } = await supabase
          .from('sequence_message_templates')
          .select('*')
          .eq('step_id', stepJoinId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching template:", error);
          wallsToast.error("Error", "Failed to load email template");
          return;
        }

        if (template) {
          setTemplateId(template.id);
          const templateSubject = template.subject || '';
          const templateHtml = template.html || '';
          // Convert Gmail format to editor format for proper display
          const editorFormattedHtml = prepareForEditor(templateHtml);
          setSubject(templateSubject);
          setHtmlContent(templateHtml);
          setCurrentEditorContent(editorFormattedHtml);
          // Store initial values for change tracking (HTML from DB is already Gmail formatted)
          setInitialSubject(templateSubject);
          setInitialHtmlContent(templateHtml);
          // Initialize stable preview states immediately with loaded content
          setStablePreviewContent(templateHtml);
          setStablePreviewSubject(templateSubject);
          // Set editor content with editor-formatted HTML
          if (editorRef.current?.getEditor()) {
            editorRef.current.getEditor()?.commands.setContent(editorFormattedHtml || '<p></p>');
          }
        } else {
          // No template exists yet - initialize with empty values
          let initialSubject = '';
          
          // If this is a follow-up step, get the original subject from the first email step
          // Only set RE: prefix if is_threaded_reply is true
          if (stepSlug === 'auto-follow-up' && currentIsThreadedReply) {
            try {
              const AUTO_EMAIL_STEP_ID = '8e9856d1-9480-46bc-86d9-fa9653128a88';
              
              // First, try to get unsaved subject from other editor refs (if available)
              let originalSubject = '';
              if (getEditorRefs) {
                const editorRefs = getEditorRefs();
                // Find the auto_email step join ID
                const { data: sequenceSteps } = await supabase
                  .from('sequence_steps_join')
                  .select(`
                    id,
                    step:sequence_steps(
                      id
                    )
                  `)
                  .eq('sequence_id', sequenceId)
                  .eq('is_archived', false)
                  .order('step_index', { ascending: true });

                if (sequenceSteps) {
                  const autoEmailStepJoin = sequenceSteps.find((stepJoin: any) => {
                    const step = Array.isArray(stepJoin.step) ? stepJoin.step[0] : stepJoin.step;
                    return step?.id === AUTO_EMAIL_STEP_ID && stepJoin.id !== stepJoinId;
                  });

                  if (autoEmailStepJoin) {
                    const autoEmailEditorRef = editorRefs[autoEmailStepJoin.id];
                    if (autoEmailEditorRef?.getSubject) {
                      const unsavedSubject = autoEmailEditorRef.getSubject();
                      if (unsavedSubject) {
                        originalSubject = unsavedSubject.trim();
                      }
                    }
                  }
                }
              }
              
              // If we didn't get an unsaved subject, try the database
              if (!originalSubject) {
                // Get all sequence steps to find the auto_email step
                const { data: sequenceSteps, error: stepsError } = await supabase
                  .from('sequence_steps_join')
                  .select(`
                    id,
                    step_index,
                    step:sequence_steps(
                      id,
                      slug,
                      channel
                    )
                  `)
                  .eq('sequence_id', sequenceId)
                  .eq('is_archived', false)
                  .order('step_index', { ascending: true });

                if (!stepsError && sequenceSteps) {
                  // Find the auto_email step (not this follow-up step)
                  const autoEmailStep = sequenceSteps.find((stepJoin: any) => {
                    const step = Array.isArray(stepJoin.step) ? stepJoin.step[0] : stepJoin.step;
                    return step?.id === AUTO_EMAIL_STEP_ID && stepJoin.id !== stepJoinId;
                  });
                  
                  if (autoEmailStep) {
                    // Get the template for the auto_email step
                    const { data: firstTemplate } = await supabase
                      .from('sequence_message_templates')
                      .select('subject')
                      .eq('step_id', autoEmailStep.id)
                      .maybeSingle();

                    if (firstTemplate?.subject) {
                      originalSubject = firstTemplate.subject.trim();
                    }
                  }
                }
              }
              
              // Process the subject: strip any existing RE: prefix and add it back
              if (originalSubject) {
                if (originalSubject.startsWith('RE:') || originalSubject.startsWith('Re:')) {
                  originalSubject = originalSubject.replace(/^RE:\s*/i, '').trim();
                }
                initialSubject = originalSubject ? `RE: ${originalSubject}` : '';
              }
            } catch (error) {
              console.error("Error fetching original subject for follow-up:", error);
            }
          }
          
          setSubject(initialSubject);
          setHtmlContent('');
          setCurrentEditorContent('');
          // Store initial values for change tracking
          setInitialSubject(initialSubject);
          setInitialHtmlContent('');
          // Initialize stable preview states
          setStablePreviewContent('');
          setStablePreviewSubject(initialSubject);
          if (editorRef.current?.getEditor()) {
            editorRef.current.getEditor()?.commands.setContent('<p></p>');
          }
        }
      } catch (error) {
        console.error("Error fetching template:", error);
        wallsToast.error("Error", "Failed to load email template");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [stepJoinId, sequenceId, stepSlug, stepId, isFollowUpStep]);

  // On mount (after loading), sync subject from initial email editor ref in case the saved
  // subject is stale (the initial email subject was changed after this follow-up was last saved).
  // Ongoing sync is handled via syncSubject() called by the initial email editor on each keystroke.
  useEffect(() => {
    if (stepSlug !== 'auto-follow-up' || !isThreadedReply || !getEditorRefs || loading) return;

    const syncOnMount = async () => {
      try {
        const AUTO_EMAIL_STEP_ID = '8e9856d1-9480-46bc-86d9-fa9653128a88';
        const editorRefs = getEditorRefs();

        const { data: sequenceSteps, error } = await supabase
          .from('sequence_steps_join')
          .select('id, step:sequence_steps(id)')
          .eq('sequence_id', sequenceId)
          .eq('is_archived', false)
          .order('step_index', { ascending: true });

        if (error || !sequenceSteps) return;

        const autoEmailStepJoin = sequenceSteps.find((sj: any) => {
          const step = Array.isArray(sj.step) ? sj.step[0] : sj.step;
          return step?.id === AUTO_EMAIL_STEP_ID && sj.id !== stepJoinId;
        });

        if (!autoEmailStepJoin) return;

        const autoEmailRef = editorRefs[autoEmailStepJoin.id];
        const currentInitialSubject = autoEmailRef?.getSubject?.()?.trim() ?? '';
        if (!currentInitialSubject) return;

        const cleaned = currentInitialSubject.replace(/^RE:\s*/i, '').trim();
        const synced = cleaned ? `RE: ${cleaned}` : '';
        // setState is a no-op when value matches, so no re-render loop
        setSubject(synced);
        setInitialSubject(synced);
      } catch (err) {
        console.error("Error syncing follow-up subject on mount:", err);
      }
    };

    const timeoutId = setTimeout(syncOnMount, 150);
    return () => clearTimeout(timeoutId);
  }, [stepSlug, isThreadedReply, getEditorRefs, sequenceId, stepJoinId, loading]);

  // Fetch contacts
  useEffect(() => {
    const fetchContacts = async () => {
      if (!sequenceId) return;

      try {
        const { data: contactsData, error: contactsError } = await supabase
          .from('sequence_people')
          .select('id, person_id, sender_id')
          .eq('sequence_id', sequenceId)
          .order('created_at', { ascending: false });

        if (contactsError) {
          console.error("Error fetching contacts:", contactsError);
          return;
        }

        if (!contactsData || contactsData.length === 0) {
          setContacts([]);
          return;
        }

        const sequencePeopleIds = contactsData.map(c => c.id);
        const { data: fieldsData } = await supabase
          .from('sequence_people_fields')
          .select('sequence_people_id, custom_fields')
          .in('sequence_people_id', sequencePeopleIds);
        const customFieldsByContactId = new Map<string, Record<string, string | null>>(
          (fieldsData || []).map((row: { sequence_people_id: string; custom_fields?: Record<string, string | null> }) => [
            row.sequence_people_id,
            row.custom_fields || {},
          ])
        );

        const personIds = contactsData.map(contact => contact.person_id).filter(Boolean);
        
        if (personIds.length === 0) {
          setContacts(contactsData.map(contact => ({ ...contact, person: null })));
          return;
        }

        const { data: peopleData, error: peopleError } = await supabase
          .from('people')
          .select('id, first_name, last_name, email, photo_url, company_name, title, phone, city, state, country, headline, seniority, linkedin_url, twitter_url, github_url, facebook_url, company_id')
          .in('id', personIds);

        if (peopleError) {
          console.error("Error fetching people data:", peopleError);
          setContacts(contactsData.map(contact => ({ ...contact, person: null })));
          return;
        }

        // Filter out LinkedIn placeholder URLs from photo_url
        const filteredPeopleData = (peopleData || []).map(person => ({
          ...person,
          photo_url: person.photo_url && person.photo_url.includes("static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2")
            ? null
            : person.photo_url
        }));

        const peopleMap = new Map(filteredPeopleData.map(person => [person.id, person]));
        
        // Get company IDs from people
        const companyIds = (peopleData || [])
          .map(person => person.company_id)
          .filter(Boolean) as string[];
        
        let companiesMap = new Map();
        if (companyIds.length > 0) {
          const { data: companiesData, error: companiesError } = await supabase
            .from('companies')
            .select('id, name, domain, website, phone, employee_count, industry, founding_year, annual_revenue, city, country, address, overview')
            .in('id', companyIds);
          
          if (!companiesError && companiesData) {
            companiesMap = new Map(companiesData.map(company => [company.id, company]));
          }
        }
        
        const contactsWithPeople = contactsData.map(contact => {
          const person = peopleMap.get(contact.person_id) || null;
          const company = person?.company_id ? companiesMap.get(person.company_id) || null : null;
          const custom_fields = customFieldsByContactId.get(contact.id) || {};
          return {
            ...contact,
            sender_id: contact.sender_id,
            person: person ? { ...person } : null,
            company: company || null,
            custom_fields,
          };
        });

        setContacts(contactsWithPeople);
        
        // Set first contact as default selection if none selected
        setSelectedContactId(prev => prev || (contactsWithPeople.length > 0 ? contactsWithPeople[0].id : ''));
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };

    if (sequenceId) {
      fetchContacts();
    }
  }, [sequenceId]);

  // Fetch sender user and team data when contact is selected
  useEffect(() => {
    const fetchSenderData = async () => {
      if (!selectedContactId) {
        setSenderUser(null);
        setSenderTeam(null);
        return;
      }

      const selectedContact = contacts.find(c => c.id === selectedContactId);
      if (!selectedContact?.sender_id) {
        setSenderUser(null);
        setSenderTeam(null);
        return;
      }

      try {
        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name, email, phone_number')
          .eq('id', selectedContact.sender_id)
          .single();

        if (userError) {
          console.error("Error fetching sender user data:", userError);
          setSenderUser(null);
        } else {
          setSenderUser(userData);
        }

        // Fetch team data
        const { data: teamData, error: teamError } = await supabase
          .from('team')
          .select('title, phone_extension')
          .eq('user_id', selectedContact.sender_id)
          .single();

        if (teamError) {
          // Team data is optional, so don't log error if not found
          setSenderTeam(null);
        } else {
          setSenderTeam(teamData);
        }
      } catch (error) {
        console.error("Error fetching sender data:", error);
        setSenderUser(null);
        setSenderTeam(null);
      }
    };

    fetchSenderData();
  }, [selectedContactId, contacts]);

  const handleSave = async () => {
    if (!stepJoinId) return;

    try {
      setSaving(true);

      // Get current HTML content from editor (normalize so paragraph spacing is preserved in email)
      const currentHtml = editorRef.current?.getEditor()?.getHTML() || '';
      const normalized = normalizeEmailHtmlForSend(currentHtml);
      
      // Transform to Gmail format (same as email composer)
      const gmailFormattedMessage = transformToGmailFormat(normalized);
      
      // Convert HTML to plain text for the text field
      const textContent = currentHtml.replace(/<[^>]+>/g, '').trim();

      if (templateId) {
        // Update existing template
        const { error } = await supabase
          .from('sequence_message_templates')
          .update({
            subject: subject || null,
            html: gmailFormattedMessage || null,
            text: textContent || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateId);

        if (error) {
          throw error;
        }
      } else {
        // Create new template
        const { data: newTemplate, error } = await supabase
          .from('sequence_message_templates')
          .insert({
            step_id: stepJoinId,
            subject: subject || null,
            html: gmailFormattedMessage || null,
            text: textContent || null,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (newTemplate) {
          setTemplateId(newTemplate.id);
        }
      }

      // Update initial values after successful save
      setInitialSubject(subject);
      setInitialHtmlContent(gmailFormattedMessage);
      setHasChanges(false);
      onChange?.(false);

      wallsToast.success("Success", "Email template saved successfully");
    } catch (error) {
      console.error("Error saving template:", error);
      wallsToast.error("Error", "Failed to save email template");
    } finally {
      setSaving(false);
    }
  };

  // Expose save function, hasChanges, getSubject, and syncSubject to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSave,
    hasChanges: hasChanges,
    getSubject: () => subject,
    syncSubject: (newOriginalSubject: string) => {
      // Only follow-up steps in reply mode respond to this
      if (stepSlug !== 'auto-follow-up' || !isThreadedReply) return;
      const cleaned = newOriginalSubject.replace(/^RE:\s*/i, '').trim();
      const synced = cleaned ? `RE: ${cleaned}` : '';
      if (synced !== subject) {
        setSubject(synced);
        setInitialSubject(synced);
      }
    },
  }), [hasChanges, stepJoinId, subject, templateId, stepSlug, isThreadedReply]);

  const selectedContact = contacts.find(c => c.id === selectedContactId);
  const personName = selectedContact?.person
    ? `${selectedContact.person.first_name || ''} ${selectedContact.person.last_name || ''}`.trim() || selectedContact.person.email || 'Unknown'
    : 'Unknown';

  // Helper function to escape HTML special characters
  const escapeHtml = useCallback((text: string | null): string => {
    if (!text) return '';
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }, []);

  // Function to replace {{sender.signature}} with formatted signature HTML
  const replaceSenderSignature = useCallback((content: string): string => {
    if (!content.includes('{{sender.signature}}')) {
      return content;
    }

    // Build signature HTML
    const signatureParts: string[] = [];
    
    // Name (first_name + last_name)
    const firstName = senderUser?.first_name || '';
    const lastName = senderUser?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      signatureParts.push(`<div><strong>${escapeHtml(fullName)}</strong></div>`);
    }
    
    // Title from team
    const title = senderTeam?.title || '';
    if (title) {
      signatureParts.push(`<div>${escapeHtml(title)}</div>`);
    }
    
    // Company name
    signatureParts.push('<div><br></div>');
    signatureParts.push('<div><strong>WALLS Entertainment</strong></div>');
    
    // Website
    signatureParts.push('<div><a target="_blank" rel="noopener noreferrer" href="http://www.wallsentertainment.com" style="color: rgb(37, 99, 235); text-decoration: underline;">www.wallsentertainment.com</a></div>');
    
    // Phone with extension
    // Use company base number "323.300.2283" and append extension if available
    const phoneExtension = senderTeam?.phone_extension || '';
    let phoneDisplay = '323.300.2283';
    if (phoneExtension) {
      phoneDisplay += ` ext. ${phoneExtension}`;
    }
    
    signatureParts.push(`<div>C // ${escapeHtml(phoneDisplay)}</div>`);
    
    // Email
    const email = senderUser?.email || '';
    if (email) {
      signatureParts.push(`<div>E // <a target="_blank" rel="noopener noreferrer" href="mailto:${escapeHtml(email)}" style="color: rgb(37, 99, 235); text-decoration: underline;">${escapeHtml(email)}</a></div>`);
    }
    
    // Combine signature parts
    const signatureHtml = signatureParts.join('');
    
    // Replace {{sender.signature}} with the signature HTML
    return content.replace(/\{\{sender\.signature\}\}/g, signatureHtml);
  }, [senderUser, senderTeam, escapeHtml]);

  // Function to replace template variables with actual values (matches backend TemplateReplacer)
  const replaceTemplateVariables = useCallback((content: string): string => {
    if (!content) return content;

    // First, replace {{sender.signature}} if present
    let result = replaceSenderSignature(content);

    const replacements: { [key: string]: string } = {};

    // Custom field replacements (from sequence_people_fields.custom_fields, same as backend)
    // Keys match template placeholders, e.g. {"custom.similar_partner": "Ellie Green"} -> {{custom.similar_partner}}
    if (selectedContact?.custom_fields && typeof selectedContact.custom_fields === 'object') {
      for (const [key, value] of Object.entries(selectedContact.custom_fields)) {
        replacements[`{{${key}}}`] = value != null ? String(value) : '';
      }
    }

    // If no person data, apply only custom replacements and return
    if (!selectedContact?.person) {
      Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
        result = result.replace(regex, value);
      });
      return result;
    }

    const person = selectedContact.person;
    const company = selectedContact.company;

    // Person field replacements
    replacements['{{person.first_name}}'] = person.first_name || '';
    replacements['{{person.last_name}}'] = person.last_name || '';
    replacements['{{person.title}}'] = person.title || '';
    replacements['{{person.phone}}'] = person.phone || '';
    replacements['{{person.email}}'] = person.email || '';
    replacements['{{person.city}}'] = person.city || '';
    replacements['{{person.state}}'] = person.state || '';
    replacements['{{person.country}}'] = person.country || '';
    replacements['{{person.company_name}}'] = person.company_name || '';
    replacements['{{person.headline}}'] = person.headline || '';
    replacements['{{person.seniority}}'] = person.seniority || '';
    replacements['{{person.linkedin_url}}'] = person.linkedin_url || '';
    replacements['{{person.twitter_url}}'] = person.twitter_url || '';
    replacements['{{person.github_url}}'] = person.github_url || '';
    replacements['{{person.facebook_url}}'] = person.facebook_url || '';

    // Company field replacements
    if (company) {
      replacements['{{company.name}}'] = company.name || '';
      replacements['{{company.domain}}'] = company.domain || '';
      replacements['{{company.website}}'] = company.website || '';
      replacements['{{company.phone}}'] = company.phone || '';
      replacements['{{company.employee_count}}'] = company.employee_count?.toString() || '';
      replacements['{{company.industry}}'] = company.industry || '';
      replacements['{{company.founding_year}}'] = company.founding_year?.toString() || '';
      replacements['{{company.annual_revenue}}'] = company.annual_revenue?.toString() || '';
      replacements['{{company.address}}'] = company.address || '';
      replacements['{{company.overview}}'] = company.overview || '';
      replacements['{{company.city}}'] = company.city || '';
      replacements['{{company.country}}'] = company.country || '';
    } else {
      replacements['{{company.name}}'] = '';
      replacements['{{company.domain}}'] = '';
      replacements['{{company.website}}'] = '';
      replacements['{{company.phone}}'] = '';
      replacements['{{company.employee_count}}'] = '';
      replacements['{{company.industry}}'] = '';
      replacements['{{company.founding_year}}'] = '';
      replacements['{{company.annual_revenue}}'] = '';
      replacements['{{company.address}}'] = '';
      replacements['{{company.overview}}'] = '';
      replacements['{{company.city}}'] = '';
      replacements['{{company.country}}'] = '';
    }

    Object.entries(replacements).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      result = result.replace(regex, value);
    });

    return result;
  }, [selectedContact, replaceSenderSignature]);

  // Debounce the editor content to prevent flashing during typing
  // Must be called before any early returns to maintain hook order
  const debouncedEditorContent = useDebounce(currentEditorContent, 300);
  const debouncedSubject = useDebounce(subject, 300);
  
  // Get preview content with variables replaced (using debounced content)
  const previewContent = useMemo(() => {
    return replaceTemplateVariables(debouncedEditorContent || htmlContent);
  }, [debouncedEditorContent, htmlContent, replaceTemplateVariables]);
  
  const previewSubject = useMemo(() => {
    return replaceTemplateVariables(debouncedSubject);
  }, [debouncedSubject, replaceTemplateVariables]);

  // Update stable preview content only after debounced content has settled
  useEffect(() => {
    if (previewContent && previewContent !== stablePreviewContent) {
      // Wait for next frame to ensure React has finished processing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStablePreviewContent(previewContent);
        });
      });
    }
  }, [previewContent, stablePreviewContent]);

  useEffect(() => {
    if (previewSubject !== undefined && previewSubject !== stablePreviewSubject) {
      // Wait for next frame to ensure React has finished processing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setStablePreviewSubject(previewSubject);
        });
      });
    }
  }, [previewSubject, stablePreviewSubject]);

  // Check for changes - run whenever subject or editor content changes
  useEffect(() => {
    // Use a small timeout to ensure editor content is updated
    const timeoutId = setTimeout(() => {
      const currentHtml = editorRef.current?.getEditor()?.getHTML() || '';
      const normalized = normalizeEmailHtmlForSend(currentHtml);
      const gmailFormattedCurrentHtml = transformToGmailFormat(normalized);
      
      const hasSubjectChanged = subject !== initialSubject;
      const hasContentChanged = gmailFormattedCurrentHtml !== initialHtmlContent;
      
      setHasChanges(hasSubjectChanged || hasContentChanged);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [subject, initialSubject, initialHtmlContent, htmlContent, currentEditorContent]);

  // Rule #4: Do NOT re-render EmailContentViewer unless debounced content changes
  // Memoize to prevent React from remounting the iframe (normalize so preview matches sent email)
  const memoizedEmailContent = useMemo(
    () => transformToGmailFormat(normalizeEmailHtmlForSend(stablePreviewContent)),
    [stablePreviewContent]
  );

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Loading template...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-0 h-[600px]">
        {/* Left: Editor */}
        <div className="flex-1 flex flex-col">
          <div className="py-4">
            <label className="text-xs font-medium text-neutral-600 mb-1 block">
              Subject
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  // Trigger change detection immediately when subject changes
                  const currentHtml = editorRef.current?.getEditor()?.getHTML() || '';
                  const normalized = normalizeEmailHtmlForSend(currentHtml);
                  const gmailFormattedContent = transformToGmailFormat(normalized);
                  const hasSubjectChanged = e.target.value !== initialSubject;
                  const hasContentChanged = gmailFormattedContent !== initialHtmlContent;
                  const newHasChanges = hasSubjectChanged || hasContentChanged;
                  setHasChanges(newHasChanges);
                  onChange?.(newHasChanges);
                  // If this is the initial email step, push the new subject to all follow-up editors
                  if (stepId === '8e9856d1-9480-46bc-86d9-fa9653128a88' && getEditorRefs) {
                    const refs = getEditorRefs();
                    (Object.values(refs) as (EmailTemplateEditorRef | null)[]).forEach(r => r?.syncSubject(e.target.value));
                  }
                }}
                placeholder="Email subject..."
                className="h-9 bg-neutral-50 shadow-inner flex-1"
                disabled={stepSlug === 'auto-follow-up' && isThreadedReply}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onTestSend}
                      disabled={testSending}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 disabled:opacity-50 disabled:pointer-events-none text-neutral-600 shrink-0"
                      aria-label="Send test email to yourself"
                    >
                      {testSending ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                      ) : (
                        <TestTube className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Send test to your email</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {isFollowUpStep && (
                <Select
                  value={isThreadedReply ? 'reply' : 'new-thread'}
                  onValueChange={async (value) => {
                    const newIsThreadedReply = value === 'reply';
                    setIsThreadedReply(newIsThreadedReply);

                    // Update is_threaded_reply in sequence_steps_join
                    try {
                      const { error } = await supabase
                        .from('sequence_steps_join')
                        .update({
                          is_threaded_reply: newIsThreadedReply,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', stepJoinId);

                      if (error) {
                        console.error("Error updating is_threaded_reply:", error);
                        wallsToast.error("Error", "Failed to update reply type");
                        // Revert on error
                        setIsThreadedReply(!newIsThreadedReply);
                        return;
                      }
                    } catch (error) {
                      console.error("Error updating is_threaded_reply:", error);
                      wallsToast.error("Error", "Failed to update reply type");
                      // Revert on error
                      setIsThreadedReply(!newIsThreadedReply);
                      return;
                    }

                    // When switching TO reply mode, sync subject from the initial email
                    if (newIsThreadedReply) {
                      try {
                        const AUTO_EMAIL_STEP_ID = '8e9856d1-9480-46bc-86d9-fa9653128a88';
                        let originalSubject = '';

                        // Try in-memory editor ref first
                        if (getEditorRefs) {
                          const editorRefs = getEditorRefs();
                          const { data: sequenceSteps } = await supabase
                            .from('sequence_steps_join')
                            .select('id, step:sequence_steps(id)')
                            .eq('sequence_id', sequenceId)
                            .eq('is_archived', false)
                            .order('step_index', { ascending: true });

                          if (sequenceSteps) {
                            const autoEmailStepJoin = sequenceSteps.find((sj: any) => {
                              const step = Array.isArray(sj.step) ? sj.step[0] : sj.step;
                              return step?.id === AUTO_EMAIL_STEP_ID && sj.id !== stepJoinId;
                            });
                            if (autoEmailStepJoin) {
                              const ref = editorRefs[autoEmailStepJoin.id];
                              if (ref?.getSubject) {
                                originalSubject = ref.getSubject().trim();
                              }
                            }
                          }
                        }

                        // Fall back to DB if nothing from refs
                        if (!originalSubject) {
                          const { data: sequenceSteps } = await supabase
                            .from('sequence_steps_join')
                            .select('id, step:sequence_steps(id)')
                            .eq('sequence_id', sequenceId)
                            .eq('is_archived', false)
                            .order('step_index', { ascending: true });

                          if (sequenceSteps) {
                            const autoEmailStep = sequenceSteps.find((sj: any) => {
                              const step = Array.isArray(sj.step) ? sj.step[0] : sj.step;
                              return step?.id === AUTO_EMAIL_STEP_ID && sj.id !== stepJoinId;
                            });
                            if (autoEmailStep) {
                              const { data: firstTemplate } = await supabase
                                .from('sequence_message_templates')
                                .select('subject')
                                .eq('step_id', autoEmailStep.id)
                                .maybeSingle();
                              if (firstTemplate?.subject) {
                                originalSubject = firstTemplate.subject.trim();
                              }
                            }
                          }
                        }

                        if (originalSubject) {
                          // Strip any existing RE: prefix then re-add it
                          originalSubject = originalSubject.replace(/^RE:\s*/i, '').trim();
                          const newSubject = `RE: ${originalSubject}`;
                          setSubject(newSubject);
                          setInitialSubject(newSubject);
                        }
                      } catch (err) {
                        console.error("Error syncing subject on reply toggle:", err);
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-9 w-[140px] bg-neutral-50 shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reply">Reply</SelectItem>
                    <SelectItem value="new-thread">New thread</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <div className="flex-1 flex flex-col rounded-md overflow-hidden bg-neutral-50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-neutral-200/50">
            <div className="flex-1 overflow-auto pl-2">
              <Editor
                ref={editorRef}
                content={currentEditorContent}
                onChange={(content) => {
                  setHtmlContent(content);
                  setCurrentEditorContent(content);
                  
                  // Trigger change detection immediately when editor content changes
                  const normalized = normalizeEmailHtmlForSend(content);
                  const gmailFormattedContent = transformToGmailFormat(normalized);
                  const hasSubjectChanged = subject !== initialSubject;
                  const hasContentChanged = gmailFormattedContent !== initialHtmlContent;
                  const newHasChanges = hasSubjectChanged || hasContentChanged;
                  setHasChanges(newHasChanges);
                  onChange?.(newHasChanges);
                }}
                placeholder="Write your email message..."
              />
            </div>
            {/* Formatting Toolbar Footer */}
            <Toolbar
              editorRef={editorRef}
              onChange={(content) => {
                setHtmlContent(content);
                setCurrentEditorContent(content);
              }}
              onSubjectChange={setSubject}
              recipientEmails={selectedContact?.person?.email ? [selectedContact.person.email] : []}
              onAttachmentsChange={setAttachments}
            />
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col" style={{ position: 'relative', overflow: 'visible' }}>
          <div className="pt-3 pb-4 pl-2">
            <div className="h-5 mb-1"></div>
            <Select value={selectedContactId} onValueChange={setSelectedContactId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a contact..." />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => {
                  const contactName = contact.person
                    ? `${contact.person.first_name || ''} ${contact.person.last_name || ''}`.trim() || contact.person.email || 'Unknown'
                    : 'Unknown';
                  return (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const photoUrl = contact.person?.photo_url;
                          const isValidPhoto = photoUrl && 
                            !photoUrl.includes("static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2");
                          const fallbackImage = FALLBACK_ICON_URL;
                          
                          return (
                            <Image
                              src={isValidPhoto ? photoUrl : fallbackImage}
                              alt={contactName}
                              width={20}
                              height={20}
                              className="rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Prevent infinite loop by checking if already showing fallback
                                if (target.src !== fallbackImage && !target.src.includes("static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2")) {
                                  target.src = fallbackImage;
                                }
                              }}
                            />
                          );
                        })()}
                        <span>{contactName}</span>
                        {contact.person?.email && (
                          <span className="text-xs text-neutral-500">({contact.person.email})</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 pl-2" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="flex-1 overflow-auto">
              <div className="p-4 rounded bg-neutral-50 shadow-inner">
                {/* Header: To and Subject */}
                <div className="pb-3" style={{ position: 'relative', overflow: 'visible' }}>
                  <div className="text-sm mb-2">
                    <span className="font-bold text-neutral-700">To:</span>{' '}
                    <span className="text-neutral-900">
                      {selectedContact ? (
                        <>
                          {personName}
                          {selectedContact.person?.email && (
                            <span className="text-neutral-600"> &lt;{selectedContact.person.email}&gt;</span>
                          )}
                        </>
                      ) : (
                        <span className="text-neutral-400 italic">No contact selected</span>
                      )}
                    </span>
                  </div>
                  <div className="text-sm pb-3 border-b border-neutral-300" style={{ position: 'relative', overflow: 'visible' }}>
                    <span className="font-bold text-neutral-700">Subject:</span>{' '}
                    <span className="text-neutral-900" style={{ position: 'relative', display: 'inline-block' }}>
                      {stablePreviewSubject ? (
                        <SpintaxText text={stablePreviewSubject} />
                      ) : (
                        <span className="text-neutral-400 italic">No subject</span>
                      )}
                    </span>
                  </div>
                </div>
                
              {/* Email Body */}
              {(currentEditorContent || htmlContent) ? (
                <EmailContentViewer 
                  content={memoizedEmailContent} 
                  isPreview={false}
                />
              ) : (
                <p className="text-neutral-400 italic text-sm">Start typing to see preview...</p>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  }
);

EmailTemplateEditor.displayName = 'EmailTemplateEditor';
