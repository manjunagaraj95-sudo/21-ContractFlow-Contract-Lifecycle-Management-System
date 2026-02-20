
import React, { useState, useEffect, useRef } from 'react';
import {
    FaUserShield, FaGavel, FaBriefcase, FaUserCheck, FaSearch, FaPlus, FaEdit, FaTrash,
    FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle, FaFileContract, FaCalendarAlt,
    FaArrowLeft, FaHistory, FaDownload, FaChartPie, FaChartBar, FaChartLine, FaTachometerAlt,
    FaEnvelopeOpenText, FaUsers, FaCog, FaSignOutAlt, FaUpload, FaFileAlt, FaLock, FaBell,
    FaBars, FaTimes, FaCircleNotch, FaExclamationCircle, FaInfoCircle
} from 'react-icons/fa';

// --- RBAC Configuration (Unified Source of Truth) ---
const ROLES = {
    ADMIN: {
        name: 'Admin',
        permissions: {
            dashboards: ['AdminDashboard', 'LegalDashboard', 'BusinessDashboard', 'ApproverDashboard'],
            screens: ['ContractList', 'ContractDetail', 'ContractForm', 'AuditLogs', 'UserSettings'],
            actions: ['createContract', 'editContract', 'deleteContract', 'approveContract', 'rejectContract', 'manageUsers', 'exportData'],
            dataVisibility: { allContracts: true, allAuditLogs: true, allUserProfiles: true },
            kpis: ['totalContracts', 'pendingApprovals', 'slaBreaches', 'contractsByStatus', 'contractVolume'],
            workflowActions: ['approve', 'reject', 'escalate', 'reassign'],
        },
        sidebarNav: [
            { id: 'AdminDashboard', label: 'Admin Dashboard', icon: FaTachometerAlt },
            { id: 'ContractList', label: 'All Contracts', icon: FaFileContract },
            { id: 'AuditLogs', label: 'Audit Logs', icon: FaHistory },
            { id: 'UserSettings', label: 'User Management', icon: FaUsers },
        ]
    },
    LEGAL_TEAM: {
        name: 'Legal Team',
        permissions: {
            dashboards: ['LegalDashboard'],
            screens: ['ContractList', 'ContractDetail', 'ContractForm'],
            actions: ['createContract', 'editContract', 'reviewContract', 'uploadDocument', 'exportData'],
            dataVisibility: { allContracts: true, ownContracts: true, contractsInReview: true },
            kpis: ['contractsInReview', 'pendingLegalReview', 'legalSlaCompliance', 'contractsByType'],
            workflowActions: ['submitForApproval', 'requestRevisions'],
        },
        sidebarNav: [
            { id: 'LegalDashboard', label: 'Legal Dashboard', icon: FaTachometerAlt },
            { id: 'ContractList', label: 'My & Team Contracts', icon: FaFileContract },
            { id: 'ContractForm', label: 'New Contract', icon: FaPlus },
        ]
    },
    BUSINESS_USER: {
        name: 'Business User',
        permissions: {
            dashboards: ['BusinessDashboard'],
            screens: ['ContractList', 'ContractDetail', 'ContractForm'],
            actions: ['createContract', 'editOwnContract', 'viewOwnContract', 'uploadDocument'],
            dataVisibility: { ownContracts: true, contractsAssignedToBusinessUnit: true },
            kpis: ['myContracts', 'myPendingApprovals', 'myExpiringContracts'],
            workflowActions: ['submitForReview'],
        },
        sidebarNav: [
            { id: 'BusinessDashboard', label: 'My Dashboard', icon: FaTachometerAlt },
            { id: 'ContractList', label: 'My Contracts', icon: FaFileContract },
            { id: 'ContractForm', label: 'New Contract Request', icon: FaPlus },
        ]
    },
    APPROVER: {
        name: 'Approver',
        permissions: {
            dashboards: ['ApproverDashboard'],
            screens: ['ContractList', 'ContractDetail'],
            actions: ['viewContract', 'approveContract', 'rejectContract'],
            dataVisibility: { contractsPendingMyApproval: true, allContracts: false },
            kpis: ['pendingMyApproval', 'myApprovalSlaCompliance'],
            workflowActions: ['approve', 'reject'],
        },
        sidebarNav: [
            { id: 'ApproverDashboard', label: 'Approvals Dashboard', icon: FaTachometerAlt },
            { id: 'ContractList', label: 'Pending Approvals', icon: FaEnvelopeOpenText },
        ]
    }
};

// --- Dummy Data (Mandatory - No Empty States) ---
const dummyUsers = [
    { id: 'user1', name: 'Alice Admin', role: 'ADMIN', email: 'alice@example.com' },
    { id: 'user2', name: 'Bob Legal', role: 'LEGAL_TEAM', email: 'bob@example.com' },
    { id: 'user3', name: 'Charlie Business', role: 'BUSINESS_USER', email: 'charlie@example.com' },
    { id: 'user4', name: 'Diana Approver', role: 'APPROVER', email: 'diana@example.com' },
    { id: 'user5', name: 'Eve Business', role: 'BUSINESS_USER', email: 'eve@example.com' },
];

const CONTRACT_STATUSES = {
    DRAFT: { label: 'Draft', colorClass: 'status-DRAFT' },
    IN_REVIEW: { label: 'In Review', colorClass: 'status-IN_REVIEW' },
    PENDING_APPROVAL: { label: 'Pending Approval', colorClass: 'status-PENDING_APPROVAL' },
    APPROVED: { label: 'Approved', colorClass: 'status-APPROVED' },
    REJECTED: { label: 'Rejected', colorClass: 'status-REJECTED' },
    ACTION_REQUIRED: { label: 'Action Required', colorClass: 'status-ACTION_REQUIRED' },
    SLA_BREACH: { label: 'SLA Breach', colorClass: 'status-SLA_BREACH' },
    EXCEPTION: { label: 'Exception', colorClass: 'status-EXCEPTION' },
    ACTIVE: { label: 'Active', colorClass: 'status-ACTIVE' },
    EXPIRED: { label: 'Expired', colorClass: 'status-EXPIRED' },
};

const contractTypes = ['NDA', 'MSA', 'SOW', 'Lease Agreement', 'Vendor Contract', 'Employment Contract'];

const generateWorkflowHistory = (status, createdBy, assignedTo) => {
    const history = [{
        stage: 'Draft',
        status: 'COMPLETED',
        actor: createdBy,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Contract created.'
    }];

    if (status !== 'DRAFT') {
        history.push({
            stage: 'Initiated Review',
            status: 'COMPLETED',
            actor: createdBy,
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            notes: 'Submitted for initial review.'
        });
    }
    if (status === 'IN_REVIEW' || status === 'PENDING_APPROVAL' || status === 'APPROVED' || status === 'REJECTED' || status === 'ACTIVE' || status === 'EXPIRED' || status === 'ACTION_REQUIRED' || status === 'SLA_BREACH') {
        history.push({
            stage: 'Legal Review',
            status: status === 'IN_REVIEW' ? 'ACTIVE' : 'COMPLETED',
            actor: 'Bob Legal (Legal Team)',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            notes: status === 'IN_REVIEW' ? 'Currently under legal review.' : 'Legal review completed.'
        });
    }
    if (status === 'PENDING_APPROVAL' || status === 'APPROVED' || status === 'REJECTED' || status === 'ACTIVE' || status === 'EXPIRED' || status === 'ACTION_REQUIRED' || status === 'SLA_BREACH') {
        history.push({
            stage: 'Business Approval',
            status: status === 'PENDING_APPROVAL' ? 'ACTIVE' : (status === 'REJECTED' ? 'REJECTED' : 'COMPLETED'),
            actor: 'Diana Approver (Approver)',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            notes: status === 'PENDING_APPROVAL' ? 'Awaiting business approval.' : (status === 'REJECTED' ? 'Rejected by Diana Approver.' : 'Approved by Diana Approver.')
        });
    }
    if (status === 'APPROVED' || status === 'ACTIVE' || status === 'EXPIRED') {
        history.push({
            stage: 'Contract Execution',
            status: 'COMPLETED',
            actor: 'System',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            notes: 'Contract signed and executed.'
        });
    }
    return history;
};

const dummyContracts = [
    {
        id: 'CON-001',
        title: 'Q4 Vendor Agreement with Acme Corp',
        type: 'Vendor Contract',
        status: 'PENDING_APPROVAL',
        startDate: '2023-10-01',
        endDate: '2024-09-30',
        value: 150000,
        currency: 'USD',
        parties: ['ContractFlow', 'Acme Corp'],
        assignedTo: 'user4', // Diana Approver
        createdBy: 'user3', // Charlie Business
        description: 'Standard vendor agreement for Q4 2023 services. Requires final approval from Diana Approver.',
        documents: [{ name: 'VendorAgreement_Acme_v1.pdf', url: '/dummy-pdf-vendor.pdf', type: 'pdf', size: '1.2MB' }],
        workflowHistory: generateWorkflowHistory('PENDING_APPROVAL', 'Charlie Business', 'Diana Approver'),
        slaStatus: 'Within SLA',
        milestones: ['Legal Review Completed', 'Pricing Confirmed', 'Awaiting Signatures'],
    },
    {
        id: 'CON-002',
        title: 'NDA with GlobalTech Solutions',
        type: 'NDA',
        status: 'APPROVED',
        startDate: '2023-09-15',
        endDate: '2024-09-14',
        value: 0,
        currency: 'USD',
        parties: ['ContractFlow', 'GlobalTech Solutions'],
        assignedTo: 'user2', // Bob Legal
        createdBy: 'user1', // Alice Admin
        description: 'Non-disclosure agreement for potential partnership discussions.',
        documents: [{ name: 'NDA_GlobalTech.pdf', url: '/dummy-pdf-nda.pdf', type: 'pdf', size: '500KB' }],
        workflowHistory: generateWorkflowHistory('APPROVED', 'Alice Admin', 'Bob Legal'),
        slaStatus: 'Completed on time',
        milestones: ['Drafted', 'Approved by Legal', 'Executed'],
    },
    {
        id: 'CON-003',
        title: 'MSA for Cloud Services with InnovateX',
        type: 'MSA',
        status: 'IN_REVIEW',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        value: 500000,
        currency: 'USD',
        parties: ['ContractFlow', 'InnovateX Inc.'],
        assignedTo: 'user2', // Bob Legal
        createdBy: 'user3', // Charlie Business
        description: 'Master Services Agreement for cloud infrastructure and support services. Currently with legal for review.',
        documents: [{ name: 'MSA_InnovateX_Draft.docx', url: '/dummy-docx-msa.docx', type: 'docx', size: '2.1MB' }],
        workflowHistory: generateWorkflowHistory('IN_REVIEW', 'Charlie Business', 'Bob Legal'),
        slaStatus: 'Within SLA',
        milestones: ['Initial Draft', 'Legal Review'],
    },
    {
        id: 'CON-004',
        title: 'Employment Agreement for New Hire (Jane Doe)',
        type: 'Employment Contract',
        status: 'DRAFT',
        startDate: '2024-01-15',
        endDate: '',
        value: 80000,
        currency: 'USD',
        parties: ['ContractFlow', 'Jane Doe'],
        assignedTo: 'user3', // Charlie Business (creator)
        createdBy: 'user3', // Charlie Business
        description: 'Draft employment contract for new Senior Engineer, Jane Doe. Pending HR review.',
        documents: [],
        workflowHistory: generateWorkflowHistory('DRAFT', 'Charlie Business', 'Charlie Business'),
        slaStatus: 'Not Applicable',
        milestones: ['Drafted'],
    },
    {
        id: 'CON-005',
        title: 'SOW for Marketing Campaign with BrandBoost',
        type: 'SOW',
        status: 'REJECTED',
        startDate: '2023-11-01',
        endDate: '2024-04-30',
        value: 75000,
        currency: 'USD',
        parties: ['ContractFlow', 'BrandBoost Agency'],
        assignedTo: 'user3', // Charlie Business (creator)
        createdBy: 'user3', // Charlie Business
        description: 'Statement of Work for Q4/Q1 marketing campaign. Rejected due to budget constraints.',
        documents: [{ name: 'SOW_BrandBoost_v2.pdf', url: '/dummy-pdf-sow.pdf', type: 'pdf', size: '800KB' }],
        workflowHistory: generateWorkflowHistory('REJECTED', 'Charlie Business', 'Diana Approver'),
        slaStatus: 'Rejected on time',
        milestones: ['Initial Draft', 'Legal Review', 'Rejected by Approver'],
    },
    {
        id: 'CON-006',
        title: 'Software License Renewal with DataInsights',
        type: 'Software License',
        status: 'SLA_BREACH',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        value: 20000,
        currency: 'USD',
        parties: ['ContractFlow', 'DataInsights Ltd.'],
        assignedTo: 'user3', // Charlie Business
        createdBy: 'user5', // Eve Business
        description: 'Annual renewal for DataInsights analytics software. SLA breached, renewal overdue.',
        documents: [{ name: 'DataInsights_License.pdf', url: '/dummy-pdf-license.pdf', type: 'pdf', size: '400KB' }],
        workflowHistory: [
            ...generateWorkflowHistory('APPROVED', 'Eve Business', 'Diana Approver').slice(0, -1),
            {
                stage: 'Renewal',
                status: 'SLA_BREACH',
                actor: 'System',
                timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Renewal initiated, but passed due date. SLA breached.'
            }
        ],
        slaStatus: 'Breached',
        milestones: ['Executed', 'Renewal Overdue'],
    },
    {
        id: 'CON-007',
        title: 'Consulting Services Agreement with ExpertSolve',
        type: 'Consulting Agreement',
        status: 'ACTIVE',
        startDate: '2023-07-01',
        endDate: '2024-06-30',
        value: 95000,
        currency: 'USD',
        parties: ['ContractFlow', 'ExpertSolve Consultants'],
        assignedTo: 'user3', // Charlie Business
        createdBy: 'user3', // Charlie Business
        description: 'Agreement for specialized IT consulting services.',
        documents: [{ name: 'ExpertSolve_CSA.pdf', url: '/dummy-pdf-csa.pdf', type: 'pdf', size: '1.5MB' }],
        workflowHistory: generateWorkflowHistory('ACTIVE', 'Charlie Business', 'Diana Approver'),
        slaStatus: 'On Track',
        milestones: ['Signed', 'Active'],
    },
    {
        id: 'CON-008',
        title: 'Office Lease Agreement - HQ',
        type: 'Lease Agreement',
        status: 'EXPIRED',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        value: 1200000,
        currency: 'USD',
        parties: ['ContractFlow', 'Property Management Inc.'],
        assignedTo: 'user1', // Alice Admin
        createdBy: 'user1', // Alice Admin
        description: 'Lease agreement for the main headquarters office. Expired at end of 2023.',
        documents: [{ name: 'OfficeLease_HQ.pdf', url: '/dummy-pdf-lease.pdf', type: 'pdf', size: '3.0MB' }],
        workflowHistory: [
            ...generateWorkflowHistory('APPROVED', 'Alice Admin', 'Diana Approver'),
            {
                stage: 'Expiration',
                status: 'COMPLETED',
                actor: 'System',
                timestamp: '2023-12-31T23:59:59Z',
                notes: 'Contract expired.'
            }
        ],
        slaStatus: 'Expired',
        milestones: ['Executed', 'Expired'],
    },
    {
        id: 'CON-009',
        title: 'Supplier Contract with RawMaterials Co.',
        type: 'Supplier Contract',
        status: 'ACTION_REQUIRED',
        startDate: '2023-05-01',
        endDate: '2024-04-30',
        value: 250000,
        currency: 'USD',
        parties: ['ContractFlow', 'RawMaterials Co.'],
        assignedTo: 'user2', // Bob Legal
        createdBy: 'user5', // Eve Business
        description: 'Contract for raw material supply. Requires legal review for a clause amendment.',
        documents: [{ name: 'Supplier_Contract_RawMaterials_v1.pdf', url: '/dummy-pdf-supplier.pdf', type: 'pdf', size: '1.1MB' }],
        workflowHistory: [
            ...generateWorkflowHistory('IN_REVIEW', 'Eve Business', 'Bob Legal').slice(0, -1),
            {
                stage: 'Legal Review',
                status: 'ACTIVE',
                actor: 'Bob Legal (Legal Team)',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Legal review in progress. Requires action on clause X.X.'
            }
        ],
        slaStatus: 'Approaching SLA',
        milestones: ['Legal Review'],
    },
    {
        id: 'CON-010',
        title: 'Partnership Agreement with Visionary Labs',
        type: 'Partnership Agreement',
        status: 'EXCEPTION',
        startDate: '2024-02-01',
        endDate: '2025-01-31',
        value: 0,
        currency: 'USD',
        parties: ['ContractFlow', 'Visionary Labs'],
        assignedTo: 'user1', // Alice Admin
        createdBy: 'user1', // Alice Admin
        description: 'Strategic partnership agreement. Stuck due to unexpected internal policy change.',
        documents: [{ name: 'Partnership_VisionaryLabs_Draft.pdf', url: '/dummy-pdf-partnership.pdf', type: 'pdf', size: '900KB' }],
        workflowHistory: [
            ...generateWorkflowHistory('PENDING_APPROVAL', 'Alice Admin', 'Diana Approver').slice(0, -1),
            {
                stage: 'Business Approval',
                status: 'EXCEPTION',
                actor: 'Diana Approver (Approver)',
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                notes: 'Approval halted due to new compliance requirements. Escalated to Admin.'
            }
        ],
        slaStatus: 'Blocked',
        milestones: ['Legal Review Completed', 'Internal Policy Exception'],
    },
];

const dummyAuditLogs = [
    { id: 'log1', timestamp: '2024-01-20T10:00:00Z', user: 'Alice Admin', action: 'CREATE', entity: 'Contract', entityId: 'CON-004', description: 'Created new contract CON-004 (Employment Agreement).' },
    { id: 'log2', timestamp: '2024-01-20T10:30:00Z', user: 'Charlie Business', action: 'UPDATE', entity: 'Contract', entityId: 'CON-001', description: 'Updated value of CON-001 to $150,000.' },
    { id: 'log3', timestamp: '2024-01-19T15:45:00Z', user: 'Diana Approver', action: 'APPROVE', entity: 'Contract', entityId: 'CON-002', description: 'Approved contract CON-002 (NDA).' },
    { id: 'log4', timestamp: '2024-01-19T09:00:00Z', user: 'Bob Legal', action: 'REVIEW', entity: 'Contract', entityId: 'CON-003', description: 'Completed legal review for CON-003.' },
    { id: 'log5', timestamp: '2024-01-18T11:20:00Z', user: 'Diana Approver', action: 'REJECT', entity: 'Contract', entityId: 'CON-005', description: 'Rejected contract CON-005 (SOW) due to budget.' },
    { id: 'log6', timestamp: '2024-01-18T11:20:00Z', user: 'System', action: 'SLA_BREACH', entity: 'Contract', entityId: 'CON-006', description: 'SLA breached for CON-006 (Software License Renewal).' },
];

const dummyRecentActivities = [
    { id: 'act1', type: 'contract_created', user: 'Alice Admin', contractId: 'CON-004', contractTitle: 'Employment Agreement', timestamp: new Date(Date.now() - 60000 * 5).toISOString() }, // 5 mins ago
    { id: 'act2', type: 'contract_updated', user: 'Charlie Business', contractId: 'CON-001', contractTitle: 'Q4 Vendor Agreement', timestamp: new Date(Date.now() - 60000 * 15).toISOString() }, // 15 mins ago
    { id: 'act3', type: 'contract_approved', user: 'Diana Approver', contractId: 'CON-002', contractTitle: 'NDA with GlobalTech', timestamp: new Date(Date.now() - 60000 * 30).toISOString() }, // 30 mins ago
    { id: 'act4', type: 'contract_review_started', user: 'Bob Legal', contractId: 'CON-003', contractTitle: 'MSA for Cloud Services', timestamp: new Date(Date.now() - 60000 * 60 * 2).toISOString() }, // 2 hours ago
    { id: 'act5', type: 'contract_rejected', user: 'Diana Approver', contractId: 'CON-005', contractTitle: 'SOW for Marketing', timestamp: new Date(Date.now() - 60000 * 60 * 5).toISOString() }, // 5 hours ago
];

// --- Utility Functions ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
};

// --- Toast Notification Component ---
const NotificationToast = ({ message, type, id, onClose }) => {
    const [visible, setVisible] = useState(true);
    const timerRef = useRef(null);

    useEffect(() => {
        if (visible) {
            timerRef.current = setTimeout(() => {
                setVisible(false);
                setTimeout(() => onClose(id), 500); // Allow fade-out animation
            }, 3000);
        }
        return () => clearTimeout(timerRef.current);
    }, [visible, id, onClose]);

    const iconMap = {
        success: FaCheckCircle,
        error: FaTimesCircle,
        info: FaInfoCircle,
        warning: FaExclamationTriangle,
    };
    const IconComponent = iconMap[type] || FaInfoCircle;

    return (
        <div className={`toast ${type} ${visible ? '' : 'hide'}`}>
            <IconComponent className="toast-icon" />
            <div className="toast-content">
                <p>{message}</p>
            </div>
        </div>
    );
};

// --- Reusable Form Field Component ---
const FormField = ({ label, name, type = 'text', value, onChange, options = [], required, error, disabled, files = [], onFileChange, onFileRemove }) => {
    const inputId = `form-field-${name}`;
    const isRequiredClass = required ? 'required-field' : '';

    const renderInput = () => {
        switch (type) {
            case 'select':
                return (
                    <select id={inputId} name={name} value={value} onChange={onChange} disabled={disabled}>
                        <option value="">Select...</option>
                        {options.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                );
            case 'textarea':
                return <textarea id={inputId} name={name} value={value} onChange={onChange} disabled={disabled} />;
            case 'file':
                return (
                    <div className="file-upload-container">
                        <input
                            type="file"
                            id={inputId}
                            name={name}
                            onChange={onFileChange}
                            multiple
                            disabled={disabled}
                        />
                        <label htmlFor={inputId} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
                            <FaUpload /> Click to upload or drag & drop files
                        </label>
                        {files.length > 0 && (
                            <div className="uploaded-files">
                                {files.map((file, index) => (
                                    <div key={index} className="uploaded-file-item">
                                        <span><FaFileAlt /> {file.name}</span>
                                        {!disabled && (
                                            <button type="button" onClick={() => onFileRemove(index)}>
                                                <FaTimes />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            default:
                return <input id={inputId} type={type} name={name} value={value} onChange={onChange} disabled={disabled} />;
        }
    };

    return (
        <div className="form-group">
            <label htmlFor={inputId} className={isRequiredClass}>
                {label}
            </label>
            {renderInput()}
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

// --- Contract Form Component (Full-Screen) ---
const ContractForm = ({ contract, userRole, onSave, onCancel, showToast, isCreatingNew = false }) => {
    const initialFormState = contract ? {
        ...contract,
        documents: contract.documents || [],
        parties: Array.isArray(contract.parties) ? contract.parties.join(', ') : contract.parties || '',
    } : {
        id: '',
        title: '',
        type: '',
        status: 'DRAFT',
        startDate: '',
        endDate: '',
        value: 0,
        currency: 'USD',
        parties: '',
        assignedTo: '',
        createdBy: dummyUsers.find(u => u.role === userRole)?.id || 'userNA',
        description: '',
        documents: [],
        workflowHistory: [],
        slaStatus: 'Not Applicable',
        milestones: [],
    };

    const [formData, setFormData] = useState(initialFormState);
    const [errors, setErrors] = useState({});

    // Auto-populate fields for new contracts based on user role
    useEffect(() => {
        if (isCreatingNew) {
            const currentUser = dummyUsers.find(u => u.role === userRole);
            setFormData(prev => ({
                ...prev,
                createdBy: currentUser ? currentUser.id : 'userNA',
                assignedTo: currentUser?.role === 'LEGAL_TEAM' ? currentUser.id : '', // Assign to self if Legal creating
                id: `CON-${String(dummyContracts.length + 1).padStart(3, '0')}`, // Simple ID generation
                status: 'DRAFT'
            }));
        }
    }, [isCreatingNew, userRole]);

    // Field-level security & status-aware form
    const isFieldEditable = (fieldName) => {
        if (userRole === 'ADMIN') return true;
        if (isCreatingNew) return true; // All fields editable during creation

        const currentStatus = formData.status;

        switch (fieldName) {
            case 'id': return false; // ID should never be editable
            case 'title':
            case 'type':
            case 'startDate':
            case 'endDate':
            case 'value':
            case 'currency':
            case 'parties':
            case 'description':
            case 'documents':
                return ['DRAFT', 'IN_REVIEW', 'ACTION_REQUIRED'].includes(currentStatus) && (userRole === 'LEGAL_TEAM' || userRole === 'BUSINESS_USER');
            case 'status': return false; // Status changes through workflow actions
            case 'assignedTo':
                return userRole === 'ADMIN' || (userRole === 'LEGAL_TEAM' && ['DRAFT', 'IN_REVIEW'].includes(currentStatus));
            case 'createdBy': return false;
            default: return false;
        }
    };

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' })); // Clear error on change
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files).map(file => ({
            name: file.name,
            url: URL.createObjectURL(file), // Dummy URL
            type: file.type.split('/')[1],
            size: `${(file.size / 1024).toFixed(1)}KB`
        }));
        setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, ...newFiles]
        }));
    };

    const handleFileRemove = (index) => {
        setFormData(prev => ({
            ...prev,
            documents: prev.documents.filter((_, i) => i !== index)
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.title) newErrors.title = 'Contract Title is required.';
        if (!formData.type) newErrors.type = 'Contract Type is required.';
        if (!formData.startDate) newErrors.startDate = 'Start Date is required.';
        if (formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
            newErrors.endDate = 'End Date cannot be before Start Date.';
        }
        if (formData.value < 0) newErrors.value = 'Value cannot be negative.';
        if (!formData.parties) newErrors.parties = 'Parties involved are required.';
        // Add more validations as per requirements

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            const formattedData = {
                ...formData,
                parties: formData.parties.split(',').map(p => p.trim()),
                value: Number(formData.value),
                workflowHistory: isCreatingNew ? generateWorkflowHistory('DRAFT', dummyUsers.find(u => u.id === formData.createdBy)?.name || 'Unknown', dummyUsers.find(u => u.id === formData.assignedTo)?.name || 'Unknown') : formData.workflowHistory
            };
            onSave(formattedData, isCreatingNew);
            showToast('Contract saved successfully!', 'success');
        } else {
            showToast('Please correct the errors in the form.', 'error');
        }
    };

    const currentStatusLabel = CONTRACT_STATUSES[formData.status]?.label || 'Unknown';

    return (
        <div className="fullscreen-view">
            <div className="fullscreen-header">
                <h2>{isCreatingNew ? 'Create New Contract' : `Edit Contract: ${formData.title}`} <span className={`card-status-ribbon ${CONTRACT_STATUSES[formData.status]?.colorClass}`} style={{ position: 'static', marginLeft: 'var(--spacing-md)' }}>{currentStatusLabel}</span></h2>
                <div className="button-group">
                    {isFieldEditable('title') && ( // Use one editable field as proxy for general editability
                        <button className="button button-primary" onClick={handleSubmit}><FaCheckCircle /> Save Contract</button>
                    )}
                    {formData.status === 'DRAFT' && (userRole === 'BUSINESS_USER' || userRole === 'LEGAL_TEAM') && (
                        <button className="button button-primary" onClick={() => {
                            if (validateForm()) {
                                onSave({ ...formData, status: 'IN_REVIEW' }, isCreatingNew);
                                showToast('Contract submitted for review!', 'info');
                            }
                        }}><FaEnvelopeOpenText /> Submit for Review</button>
                    )}
                    <button className="button button-secondary" onClick={onCancel}><FaTimes /> Cancel</button>
                </div>
            </div>

            <div className="detail-section">
                <h3>General Information</h3>
                <div className="form-grid">
                    <FormField label="Contract ID" name="id" value={formData.id} disabled={true} />
                    <FormField
                        label="Contract Title"
                        name="title"
                        value={formData.title}
                        onChange={handleFieldChange}
                        required
                        error={errors.title}
                        disabled={!isFieldEditable('title')}
                    />
                    <FormField
                        label="Contract Type"
                        name="type"
                        type="select"
                        value={formData.type}
                        onChange={handleFieldChange}
                        options={contractTypes.map(type => ({ value: type, label: type }))}
                        required
                        error={errors.type}
                        disabled={!isFieldEditable('type')}
                    />
                    <FormField
                        label="Start Date"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleFieldChange}
                        required
                        error={errors.startDate}
                        disabled={!isFieldEditable('startDate')}
                    />
                    <FormField
                        label="End Date"
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleFieldChange}
                        error={errors.endDate}
                        disabled={!isFieldEditable('endDate')}
                    />
                    <FormField
                        label="Contract Value"
                        name="value"
                        type="number"
                        value={formData.value}
                        onChange={handleFieldChange}
                        error={errors.value}
                        disabled={!isFieldEditable('value')}
                    />
                    <FormField
                        label="Currency"
                        name="currency"
                        type="select"
                        value={formData.currency}
                        onChange={handleFieldChange}
                        options={[{ value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }]}
                        disabled={!isFieldEditable('currency')}
                    />
                    <FormField
                        label="Parties Involved (comma-separated)"
                        name="parties"
                        value={formData.parties}
                        onChange={handleFieldChange}
                        required
                        error={errors.parties}
                        disabled={!isFieldEditable('parties')}
                    />
                    <FormField
                        label="Assigned To"
                        name="assignedTo"
                        type="select"
                        value={formData.assignedTo}
                        onChange={handleFieldChange}
                        options={dummyUsers.map(user => ({ value: user.id, label: `${user.name} (${user.role.replace('_', ' ')})` }))}
                        disabled={!isFieldEditable('assignedTo')}
                    />
                    <FormField
                        label="Created By"
                        name="createdBy"
                        type="select"
                        value={formData.createdBy}
                        onChange={handleFieldChange}
                        options={dummyUsers.map(user => ({ value: user.id, label: `${user.name} (${user.role.replace('_', ' ')})` }))}
                        disabled={true} // Should not be editable
                    />
                </div>
                <FormField
                    label="Description"
                    name="description"
                    type="textarea"
                    value={formData.description}
                    onChange={handleFieldChange}
                    disabled={!isFieldEditable('description')}
                />
            </div>

            <div className="detail-section">
                <h3>Documents</h3>
                <FormField
                    label="Upload Documents"
                    name="documents"
                    type="file"
                    files={formData.documents}
                    onFileChange={handleFileChange}
                    onFileRemove={handleFileRemove}
                    disabled={!isFieldEditable('documents')}
                />
                {formData.documents.length === 0 && <p className="text-center" style={{color: 'var(--text-secondary)'}}>No documents attached.</p>}
            </div>
        </div>
    );
};

// --- Contract Detail Component (Full-Screen) ---
const ContractDetail = ({ contract, userRole, onBack, onEdit, onUpdateStatus, showToast }) => {
    if (!contract) return <p>No contract selected.</p>;

    const currentUser = dummyUsers.find(u => u.role === userRole);

    // RBAC: Determine if user can edit this specific contract
    const canEditThisContract = (
        userRole === 'ADMIN' ||
        (userRole === 'LEGAL_TEAM' && ['DRAFT', 'IN_REVIEW', 'ACTION_REQUIRED'].includes(contract.status)) ||
        (userRole === 'BUSINESS_USER' && contract.createdBy === currentUser?.id && ['DRAFT', 'ACTION_REQUIRED'].includes(contract.status))
    );

    // RBAC: Determine if user can approve/reject
    const canApproveReject = (
        userRole === 'APPROVER' &&
        contract.status === 'PENDING_APPROVAL' &&
        contract.assignedTo === currentUser?.id // Only approve if assigned to this approver
    );

    // Filter audit logs based on role-based visibility (e.g., Business Users might not see all sensitive logs)
    const filteredAuditLogs = userRole === 'BUSINESS_USER'
        ? dummyAuditLogs.filter(log => log.entityId === contract.id && !log.action.includes('DELETE'))
        : dummyAuditLogs.filter(log => log.entityId === contract.id);


    const handleStatusChange = (newStatus) => {
        if (canApproveReject || userRole === 'ADMIN' || (userRole === 'LEGAL_TEAM' && newStatus === 'ACTIVE')) {
            // Simulate updating workflow history
            const newWorkflowHistory = [...contract.workflowHistory];
            const currentStage = newWorkflowHistory.find(stage => stage.status === 'ACTIVE');
            if (currentStage) {
                currentStage.status = 'COMPLETED';
                currentStage.timestamp = new Date().toISOString();
                currentStage.notes = `${currentStage.stage} completed.`;
            }

            if (newStatus === 'APPROVED') {
                newWorkflowHistory.push({
                    stage: 'Business Approval',
                    status: 'COMPLETED',
                    actor: currentUser.name,
                    timestamp: new Date().toISOString(),
                    notes: 'Contract approved by Approver.'
                });
                newWorkflowHistory.push({
                    stage: 'Contract Execution',
                    status: 'COMPLETED',
                    actor: 'System',
                    timestamp: new Date().toISOString(),
                    notes: 'Contract signed and executed.'
                });
            } else if (newStatus === 'REJECTED') {
                newWorkflowHistory.push({
                    stage: 'Business Approval',
                    status: 'REJECTED',
                    actor: currentUser.name,
                    timestamp: new Date().toISOString(),
                    notes: 'Contract rejected by Approver.'
                });
            } else if (newStatus === 'IN_REVIEW' && userRole === 'LEGAL_TEAM') {
                 // For legal to send back to business for action
                 newWorkflowHistory.push({
                    stage: 'Legal Review',
                    status: 'ACTIVE',
                    actor: currentUser.name,
                    timestamp: new Date().toISOString(),
                    notes: 'Legal requested revisions from business user.'
                });
            }

            onUpdateStatus(contract.id, newStatus, newWorkflowHistory);
            showToast(`Contract ${newStatus.toLowerCase()} successfully!`, newStatus === 'APPROVED' ? 'success' : 'info');
        } else {
            showToast('You do not have permission to perform this action.', 'error');
        }
    };

    const currentWorkflowStage = contract.workflowHistory.find(s => s.status === 'ACTIVE' || s.status === 'PENDING_APPROVAL')?.stage || 'N/A';

    return (
        <div className="fullscreen-view">
            <div className="fullscreen-header">
                <h2>Contract: {contract.title} <span className={`card-status-ribbon ${CONTRACT_STATUSES[contract.status]?.colorClass}`} style={{ position: 'static', marginLeft: 'var(--spacing-md)' }}>{CONTRACT_STATUSES[contract.status]?.label}</span></h2>
                <div className="button-group">
                    <button className="button button-secondary" onClick={onBack}><FaArrowLeft /> Back to List</button>
                    {canEditThisContract && (
                        <button className="button button-primary" onClick={() => onEdit(contract.id)}><FaEdit /> Edit Contract</button>
                    )}
                    {canApproveReject && (
                        <>
                            <button className="button button-success button-primary" onClick={() => handleStatusChange('APPROVED')}><FaCheckCircle /> Approve</button>
                            <button className="button button-danger" onClick={() => handleStatusChange('REJECTED')}><FaTimesCircle /> Reject</button>
                        </>
                    )}
                    {userRole === 'LEGAL_TEAM' && contract.status === 'IN_REVIEW' && (
                        <button className="button button-warning button-primary" onClick={() => handleStatusChange('ACTION_REQUIRED')}><FaExclamationTriangle /> Request Revisions</button>
                    )}
                    {(userRole === 'ADMIN' && contract.status === 'EXCEPTION') && (
                        <button className="button button-info button-primary" onClick={() => handleStatusChange('PENDING_APPROVAL')}><FaEnvelopeOpenText /> Escalate for Approval</button>
                    )}
                </div>
            </div>

            <div className="detail-section">
                <h3>Contract Details</h3>
                <div className="detail-grid">
                    <div className="detail-item"><label>ID</label><p>{contract.id}</p></div>
                    <div className="detail-item"><label>Type</label><p>{contract.type}</p></div>
                    <div className="detail-item"><label>Status</label><p>{CONTRACT_STATUSES[contract.status]?.label}</p></div>
                    <div className="detail-item"><label>Start Date</label><p>{formatDate(contract.startDate)}</p></div>
                    <div className="detail-item"><label>End Date</label><p>{formatDate(contract.endDate)}</p></div>
                    <div className="detail-item"><label>Value</label><p>{contract.value.toLocaleString('en-US', { style: 'currency', currency: contract.currency || 'USD' })}</p></div>
                    <div className="detail-item"><label>Parties</label><p>{Array.isArray(contract.parties) ? contract.parties.join(', ') : contract.parties}</p></div>
                    <div className="detail-item"><label>Assigned To</label><p>{dummyUsers.find(u => u.id === contract.assignedTo)?.name || 'N/A'}</p></div>
                    <div className="detail-item"><label>Created By</label><p>{dummyUsers.find(u => u.id === contract.createdBy)?.name || 'N/A'}</p></div>
                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}><label>Description</label><p>{contract.description}</p></div>
                </div>
            </div>

            <div className="detail-section">
                <h3>Workflow Progress ({currentWorkflowStage})</h3>
                <div className="workflow-tracker">
                    {['Draft', 'Initiated Review', 'Legal Review', 'Business Approval', 'Contract Execution'].map(stage => (
                        <div key={stage} className={`workflow-stage 
                            ${contract.workflowHistory.some(h => h.stage === stage && h.status === 'COMPLETED') ? 'completed' : ''}
                            ${contract.workflowHistory.some(h => h.stage === stage && h.status === 'ACTIVE' || (h.stage === stage && h.status === 'PENDING_APPROVAL')) ? 'active' : ''}
                        `}>
                            <div className="workflow-dot"></div>
                            <p>{stage}</p>
                        </div>
                    ))}
                </div>
                <h4>Milestones</h4>
                <ul>
                    {contract.milestones.length > 0 ? contract.milestones.map((milestone, index) => (
                        <li key={index}>{milestone}</li>
                    )) : <li>No specific milestones defined.</li>}
                </ul>
                <h4 style={{marginTop: 'var(--spacing-md)'}}>SLA Status: <span style={{color: contract.slaStatus === 'Breached' ? 'var(--error-color)' : 'var(--success-color)'}}>{contract.slaStatus}</span></h4>
            </div>

            <div className="detail-section">
                <h3>Documents</h3>
                {contract.documents.length > 0 ? (
                    <div className="document-list">
                        {contract.documents.map((doc, index) => (
                            <div key={index} className="uploaded-file-item">
                                <span><FaFileAlt /> {doc.name} ({doc.size})</span>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="button button-secondary button-small"><FaDownload /> Preview / Download</a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center" style={{color: 'var(--text-secondary)'}}>No documents attached.</p>
                )}
            </div>

            {userRole === 'ADMIN' || ROLES[userRole].permissions.screens.includes('AuditLogs') ? (
                <div className="detail-section">
                    <h3>Audit Log</h3>
                    {filteredAuditLogs.length > 0 ? (
                        <table className="audit-log-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAuditLogs.map(log => (
                                    <tr key={log.id}>
                                        <td>{formatDateTime(log.timestamp)}</td>
                                        <td>{log.user}</td>
                                        <td>{log.action}</td>
                                        <td>{log.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center" style={{color: 'var(--text-secondary)'}}>No audit records for this contract.</p>
                    )}
                </div>
            ) : null}
        </div>
    );
};

// --- Contract Card Component ---
const ContractCard = ({ contract, onClick }) => {
    const statusInfo = CONTRACT_STATUSES[contract.status] || CONTRACT_STATUSES.DRAFT;

    return (
        <div className={`card ${statusInfo.colorClass}`} onClick={() => onClick(contract.id)}>
            <div className="card-header-colored">
                <span>{contract.id}</span>
                <span className="card-status-ribbon" style={{ backgroundColor: statusInfo.colorClass.split('-')[1] === 'APPROVED' ? 'var(--status-approved)' : (statusInfo.colorClass.split('-')[1] === 'REJECTED' ? 'var(--status-rejected)' : '') }}>{statusInfo.label}</span>
            </div>
            <h3>{contract.title}</h3>
            <p><strong>Type:</strong> {contract.type}</p>
            <p><strong>Assigned To:</strong> {dummyUsers.find(u => u.id === contract.assignedTo)?.name || 'N/A'}</p>
            <div className="card-meta">
                <span><FaCalendarAlt /> {formatDate(contract.startDate)} - {formatDate(contract.endDate)}</span>
                <span>{contract.value.toLocaleString('en-US', { style: 'currency', currency: contract.currency || 'USD' })}</span>
            </div>
        </div>
    );
};

// --- Dashboard Components ---
const KPI_CONFIGS = {
    totalContracts: { title: 'Total Contracts', icon: FaFileContract, value: (contracts, role, userId) => contracts.length },
    pendingApprovals: { title: 'Pending Approvals', icon: FaEnvelopeOpenText, value: (contracts, role, userId) => contracts.filter(c => c.status === 'PENDING_APPROVAL').length, isWarning: true },
    slaBreaches: { title: 'SLA Breaches', icon: FaExclamationTriangle, value: (contracts, role, userId) => contracts.filter(c => c.status === 'SLA_BREACH').length, isDanger: true },
    contractsInReview: { title: 'Contracts In Review', icon: FaClock, value: (contracts, role, userId) => contracts.filter(c => c.status === 'IN_REVIEW').length, isInfo: true },
    myContracts: { title: 'My Contracts', icon: FaUserShield, value: (contracts, role, userId) => contracts.filter(c => c.createdBy === userId || c.assignedTo === userId).length },
    myPendingApprovals: { title: 'My Pending Approvals', icon: FaUserCheck, value: (contracts, role, userId) => contracts.filter(c => c.status === 'PENDING_APPROVAL' && c.assignedTo === userId).length, isWarning: true },
    myExpiringContracts: { title: 'My Expiring Contracts', icon: FaCalendarAlt, value: (contracts, role, userId) => contracts.filter(c => c.createdBy === userId && c.endDate && new Date(c.endDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && new Date(c.endDate) > new Date()).length, isInfo: true },
};

const KPICard = ({ title, value, trend, icon: Icon, isDanger, isWarning, isSuccess, isInfo, pulse }) => {
    const valueClass = isDanger ? 'danger' : (isWarning ? 'warning' : (isSuccess ? 'success' : (isInfo ? 'info' : '')));
    const trendClass = trend > 0 ? 'positive' : (trend < 0 ? 'negative' : '');
    return (
        <div className={`kpi-card ${pulse ? 'pulse' : ''}`}>
            <h4>{title}</h4>
            <div className="kpi-value-wrapper flex-row justify-between align-center">
                <span className={`kpi-value ${valueClass}`}>{value}</span>
                {Icon && <Icon style={{fontSize: 'var(--font-size-xl)', color: isDanger ? 'var(--error-color)' : (isWarning ? 'var(--warning-color)' : (isSuccess ? 'var(--success-color)' : 'var(--primary-color)'))}} />}
            </div>
            {trend !== undefined && <p className={`kpi-trend ${trendClass}`}>{trend > 0 ? '↑' : (trend < 0 ? '↓' : '')} {Math.abs(trend)}% vs. last month</p>}
        </div>
    );
};

const ChartPlaceholder = ({ title, type, userRole }) => {
    return (
        <div className="chart-container">
            <h3>{title}</h3>
            <div className="chart-placeholder">
                <FaChartPie style={{marginRight: 'var(--spacing-sm)'}} /> {type} Chart Placeholder <br/> (User Role: {ROLES[userRole].name})
            </div>
        </div>
    );
};

const RecentActivitiesPanel = ({ activities, userRole }) => {
    // Filter activities based on role, e.g., non-admin users only see relevant activities for their contracts
    const filteredActivities = userRole === 'ADMIN' ? activities : activities.filter(act => {
        const contract = dummyContracts.find(c => c.id === act.contractId);
        const currentUser = dummyUsers.find(u => u.role === userRole);
        if (!contract || !currentUser) return false;
        return contract.createdBy === currentUser.id || contract.assignedTo === currentUser.id || act.user === currentUser.name;
    });

    const getActivityIcon = (type) => {
        switch (type) {
            case 'contract_created': return <FaPlus />;
            case 'contract_updated': return <FaEdit />;
            case 'contract_approved': return <FaCheckCircle className="icon-success" />;
            case 'contract_rejected': return <FaTimesCircle className="icon-danger" />;
            case 'contract_review_started': return <FaClock className="icon-info" />;
            default: return <FaInfoCircle />;
        }
    };

    return (
        <div className="recent-activities-panel">
            <h3>Recent Activities</h3>
            {filteredActivities.length > 0 ? filteredActivities.map(activity => (
                <div key={activity.id} className="activity-item">
                    <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                    <div className="activity-content">
                        <p>
                            <strong>{activity.user}</strong> {activity.type.replace(/_/g, ' ')} {activity.contractId && `for `}
                            {activity.contractId && <a href="#contract" onClick={(e) => e.preventDefault()} style={{fontWeight: 'var(--font-weight-medium)'}}>{activity.contractTitle} ({activity.contractId})</a>}.
                        </p>
                        <p className="timestamp">{formatDateTime(activity.timestamp)}</p>
                    </div>
                </div>
            )) : (
                <p className="text-center" style={{color: 'var(--text-secondary)'}}>No recent activities for your role.</p>
            )}
        </div>
    );
};


const Dashboard = ({ userRole, contracts, navigate }) => {
    const currentUser = dummyUsers.find(u => u.role === userRole);
    const userId = currentUser?.id;

    // Filter contracts based on RBAC rules for data visibility
    const getContractsForDashboard = () => {
        const permissions = ROLES[userRole].permissions.dataVisibility;
        if (permissions.allContracts) return contracts;
        if (permissions.ownContracts) return contracts.filter(c => c.createdBy === userId || c.assignedTo === userId);
        if (permissions.contractsInReview) return contracts.filter(c => c.status === 'IN_REVIEW');
        if (permissions.contractsPendingMyApproval) return contracts.filter(c => c.status === 'PENDING_APPROVAL' && c.assignedTo === userId);
        return []; // Default to no contracts if no specific permission
    };

    const dashboardContracts = getContractsForDashboard();

    // Dynamically select KPIs based on role permissions
    const getKpisForRole = () => {
        const allowedKpis = ROLES[userRole].permissions.kpis;
        return Object.keys(KPI_CONFIGS)
            .filter(kpiKey => allowedKpis.includes(kpiKey))
            .map(kpiKey => {
                const config = KPI_CONFIGS[kpiKey];
                return {
                    id: kpiKey,
                    title: config.title,
                    value: config.value(dashboardContracts, userRole, userId),
                    icon: config.icon,
                    isDanger: config.isDanger,
                    isWarning: config.isWarning,
                    isSuccess: config.isSuccess,
                    isInfo: config.isInfo,
                    pulse: (kpiKey === 'pendingApprovals' || kpiKey === 'slaBreaches') // Example pulse
                };
            });
    };

    const roleKpis = getKpisForRole();

    return (
        <div className="dashboard">
            <h2 style={{ marginBottom: 'var(--spacing-xl)', color: 'var(--primary-dark)' }}>{ROLES[userRole].name} Dashboard</h2>

            <div className="kpi-grid">
                {roleKpis.map(kpi => (
                    <KPICard key={kpi.id} {...kpi} />
                ))}
            </div>

            <div className="charts-grid">
                {ROLES[userRole].permissions.kpis.includes('contractsByStatus') && (
                    <ChartPlaceholder title="Contract Status Distribution" type="Donut" userRole={userRole} />
                )}
                {ROLES[userRole].permissions.kpis.includes('contractVolume') && (
                    <ChartPlaceholder title="Contract Volume Over Time" type="Line" userRole={userRole} />
                )}
                {userRole === 'LEGAL_TEAM' && (
                    <ChartPlaceholder title="Legal Review SLA Compliance" type="Gauge" userRole={userRole} />
                )}
                {userRole === 'BUSINESS_USER' && (
                    <ChartPlaceholder title="My Contract Types" type="Bar" userRole={userRole} />
                )}
            </div>

            <RecentActivitiesPanel activities={dummyRecentActivities} userRole={userRole} />
        </div>
    );
};

// --- Contract List Component ---
const ContractList = ({ contracts, userRole, navigate, showToast }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    const currentUser = dummyUsers.find(u => u.role === userRole);
    const userId = currentUser?.id;

    // Filter contracts based on RBAC data visibility for the list
    const getFilteredContracts = () => {
        let filtered = contracts;

        const permissions = ROLES[userRole].permissions.dataVisibility;
        if (!permissions.allContracts) { // If not admin or full access
            if (permissions.ownContracts) {
                filtered = filtered.filter(c => c.createdBy === userId || c.assignedTo === userId);
            } else if (permissions.contractsInReview && userRole === 'LEGAL_TEAM') {
                filtered = filtered.filter(c => c.status === 'IN_REVIEW' || c.assignedTo === userId);
            } else if (permissions.contractsPendingMyApproval && userRole === 'APPROVER') {
                filtered = filtered.filter(c => c.status === 'PENDING_APPROVAL' && c.assignedTo === userId);
            } else {
                filtered = []; // No data visible by default
            }
        }

        // Apply search and status filters
        if (searchTerm) {
            filtered = filtered.filter(contract =>
                contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contract.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contract.parties.join(', ').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterStatus !== 'ALL') {
            filtered = filtered.filter(contract => contract.status === filterStatus);
        }

        return filtered;
    };

    const displayContracts = getFilteredContracts();

    const canCreateContract = ROLES[userRole].permissions.actions.includes('createContract');

    return (
        <div className="contract-list">
            <div className="page-header">
                <h2>Contracts</h2>
                <div className="page-actions">
                    <input
                        type="search"
                        placeholder="Search contracts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: 'var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', minWidth: '200px' }}
                    />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ padding: 'var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', marginLeft: 'var(--spacing-md)' }}
                    >
                        <option value="ALL">All Statuses</option>
                        {Object.entries(CONTRACT_STATUSES).map(([key, value]) => (
                            <option key={key} value={key}>{value.label}</option>
                        ))}
                    </select>
                    {canCreateContract && (
                        <button className="button button-primary" onClick={() => navigate('ContractForm', null, true)}>
                            <FaPlus /> New Contract
                        </button>
                    )}
                </div>
            </div>

            {displayContracts.length > 0 ? (
                <div className="card-grid">
                    {displayContracts.map(contract => (
                        <ContractCard key={contract.id} contract={contract} onClick={navigate} />
                    ))}
                </div>
            ) : (
                <div className="text-center" style={{padding: 'var(--spacing-xxl)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', margin: 'var(--spacing-xl) 0', backgroundColor: 'var(--bg-dark)'}}>
                    <FaFileContract size={64} style={{color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)'}} />
                    <h3 style={{color: 'var(--primary-color)'}}>No Contracts Found</h3>
                    <p style={{color: 'var(--text-secondary)'}}>There are no contracts matching your criteria or accessible by your role.</p>
                    {canCreateContract && (
                        <button className="button button-primary mt-lg" onClick={() => navigate('ContractForm', null, true)}>
                            <FaPlus /> Create First Contract
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Audit Logs Component ---
const AuditLogs = ({ auditLogs, userRole }) => {
    // RBAC: Admin sees all logs, other roles might see limited/filtered logs
    const filteredAuditLogs = userRole === 'ADMIN' ? auditLogs : auditLogs.filter(log => log.user === dummyUsers.find(u => u.role === userRole)?.name);

    return (
        <div className="audit-logs">
            <div className="page-header">
                <h2>Audit Logs</h2>
                {userRole === 'ADMIN' && (
                    <button className="button button-secondary"><FaDownload /> Export Logs</button>
                )}
            </div>

            {filteredAuditLogs.length > 0 ? (
                <div className="detail-section">
                    <table className="audit-log-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Entity</th>
                                <th>Entity ID</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAuditLogs.map(log => (
                                <tr key={log.id}>
                                    <td>{formatDateTime(log.timestamp)}</td>
                                    <td>{log.user}</td>
                                    <td>{log.action}</td>
                                    <td>{log.entity}</td>
                                    <td>{log.entityId}</td>
                                    <td>{log.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center" style={{padding: 'var(--spacing-xxl)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)', margin: 'var(--spacing-xl) 0', backgroundColor: 'var(--bg-dark)'}}>
                    <FaHistory size={64} style={{color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)'}} />
                    <h3 style={{color: 'var(--primary-color)'}}>No Audit Records</h3>
                    <p style={{color: 'var(--text-secondary)'}}>No audit logs are available or accessible by your current role.</p>
                </p>
            )}
        </div>
    );
};

// --- User Settings Component ---
const UserSettings = ({ userRole, showToast }) => {
    // Only Admin can access this screen based on RBAC in App.jsx
    const [users, setUsers] = useState(dummyUsers);
    const [editingUser, setEditingUser] = useState(null);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'BUSINESS_USER' });
    const [formErrors, setFormErrors] = useState({});

    const handleEditClick = (user) => {
        setEditingUser({ ...user });
        setFormErrors({});
    };

    const handleSaveUser = () => {
        if (!editingUser.name || !editingUser.email || !editingUser.role) {
            setFormErrors({ ...formErrors, name: !editingUser.name && 'Name required', email: !editingUser.email && 'Email required', role: !editingUser.role && 'Role required' });
            showToast('Please fill all mandatory fields.', 'error');
            return;
        }

        setUsers(prevUsers => prevUsers.map(u => u.id === editingUser.id ? editingUser : u));
        setEditingUser(null);
        showToast(`User ${editingUser.name} updated.`, 'success');
    };

    const handleCreateUser = () => {
        if (!newUserForm.name || !newUserForm.email || !newUserForm.role) {
            setFormErrors({ ...formErrors, name: !newUserForm.name && 'Name required', email: !newUserForm.email && 'Email required', role: !newUserForm.role && 'Role required' });
            showToast('Please fill all mandatory fields.', 'error');
            return;
        }

        const newId = `user${users.length + 1}`;
        const userToAdd = { ...newUserForm, id: newId };
        setUsers(prevUsers => [...prevUsers, userToAdd]);
        setNewUserForm({ name: '', email: '', role: 'BUSINESS_USER' });
        showToast(`New user ${userToAdd.name} created.`, 'success');
    };

    const handleDeleteUser = (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(prevUsers => prevUsers.filter(u => u.id !== id));
            showToast('User deleted.', 'info');
        }
    };

    return (
        <div className="user-settings">
            <div className="page-header">
                <h2>User Management</h2>
                {userRole === 'ADMIN' && (
                    <button className="button button-primary" onClick={() => setEditingUser({ id: `new${users.length + 1}`, name: '', email: '', role: 'BUSINESS_USER' })}><FaPlus /> Add New User</button>
                )}
            </div>

            <div className="detail-section">
                <h3>Existing Users</h3>
                <table className="audit-log-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{ROLES[user.role]?.name || user.role}</td>
                                <td>
                                    {userRole === 'ADMIN' && (
                                        <>
                                            <button className="button button-secondary" style={{ marginRight: 'var(--spacing-sm)' }} onClick={() => handleEditClick(user)}><FaEdit /></button>
                                            <button className="button button-danger" onClick={() => handleDeleteUser(user.id)}><FaTrash /></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {(editingUser || (userRole === 'ADMIN' && newUserForm.name)) && (
                <div className="detail-section" style={{marginTop: 'var(--spacing-xl)'}}>
                    <h3>{editingUser && editingUser.id.startsWith('new') ? 'Add New User' : `Edit User: ${editingUser?.name}`}</h3>
                    <div className="form-grid">
                        <FormField
                            label="Name"
                            name="name"
                            value={editingUser ? editingUser.name : newUserForm.name}
                            onChange={(e) => editingUser ? setEditingUser({ ...editingUser, name: e.target.value }) : setNewUserForm({ ...newUserForm, name: e.target.value })}
                            required
                            error={formErrors.name}
                        />
                        <FormField
                            label="Email"
                            name="email"
                            type="email"
                            value={editingUser ? editingUser.email : newUserForm.email}
                            onChange={(e) => editingUser ? setEditingUser({ ...editingUser, email: e.target.value }) : setNewUserForm({ ...newUserForm, email: e.target.value })}
                            required
                            error={formErrors.email}
                        />
                        <FormField
                            label="Role"
                            name="role"
                            type="select"
                            value={editingUser ? editingUser.role : newUserForm.role}
                            onChange={(e) => editingUser ? setEditingUser({ ...editingUser, role: e.target.value }) : setNewUserForm({ ...newUserForm, role: e.target.value })}
                            options={Object.keys(ROLES).map(roleKey => ({ value: roleKey, label: ROLES[roleKey].name }))}
                            required
                            error={formErrors.role}
                        />
                    </div>
                    <div className="form-actions">
                        <button className="button button-secondary" onClick={() => { setEditingUser(null); setNewUserForm({ name: '', email: '', role: 'BUSINESS_USER' }); setFormErrors({}); }}><FaTimes /> Cancel</button>
                        {editingUser ? (
                            <button className="button button-primary" onClick={handleSaveUser}><FaCheckCircle /> Save Changes</button>
                        ) : (
                            <button className="button button-primary" onClick={handleCreateUser}><FaPlus /> Create User</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- App Component (Main) ---
export const App = () => {
    const [userRole, setUserRole] = useState('ADMIN'); // Default role for demo
    const [currentScreen, setCurrentScreen] = useState('AdminDashboard');
    const [selectedRecordId, setSelectedRecordId] = useState(null);
    const [screenHistory, setScreenHistory] = useState([]); // For full-screen navigation back
    const [contracts, setContracts] = useState(dummyContracts); // Mutable contracts state
    const [notifications, setNotifications] = useState([]);
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile sidebar toggle

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const navigate = (screenId, recordId = null, isNewRecord = false) => {
        setScreenHistory(prev => [...prev, { screen: currentScreen, recordId: selectedRecordId }]);
        setCurrentScreen(screenId);
        setSelectedRecordId(recordId);
        if (screenId === 'ContractForm') {
            // If it's a new contract form, clear selectedRecordId to indicate new creation
            setSelectedRecordId(isNewRecord ? null : recordId);
        }
        setSidebarOpen(false); // Close sidebar on navigate (mobile)
    };

    const goBack = () => {
        if (screenHistory.length > 0) {
            const lastScreen = screenHistory[screenHistory.length - 1];
            setScreenHistory(prev => prev.slice(0, -1));
            setCurrentScreen(lastScreen.screen);
            setSelectedRecordId(lastScreen.recordId);
        } else {
            setCurrentScreen(ROLES[userRole].sidebarNav[0].id); // Go to default dashboard
            setSelectedRecordId(null);
        }
    };

    // RBAC: Generic permission check
    const canAccess = (type, value) => {
        const permissions = ROLES[userRole]?.permissions;
        if (!permissions) return false;

        switch (type) {
            case 'dashboard': return permissions.dashboards.includes(value);
            case 'screen': return permissions.screens.includes(value);
            case 'action': return permissions.actions.includes(value);
            case 'data': return permissions.dataVisibility[value] || false; // e.g. 'allContracts', 'ownContracts'
            case 'workflowAction': return permissions.workflowActions.includes(value);
            default: return false;
        }
    };

    const handleRoleChange = (e) => {
        const newRole = e.target.value;
        setUserRole(newRole);
        setCurrentScreen(ROLES[newRole].sidebarNav[0].id); // Navigate to default dashboard for new role
        setSelectedRecordId(null);
        setScreenHistory([]);
        showToast(`Switched to ${ROLES[newRole].name} role`, 'info');
    };

    const handleSaveContract = (updatedContract, isNew) => {
        if (isNew) {
            setContracts(prev => [...prev, updatedContract]);
            navigate('ContractList'); // Go back to list after creating
        } else {
            setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
            navigate('ContractDetail', updatedContract.id); // Go back to detail after editing
        }
    };

    const handleUpdateContractStatus = (contractId, newStatus, newWorkflowHistory) => {
        setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: newStatus, workflowHistory: newWorkflowHistory } : c));
        // No explicit navigate as we stay on detail page, just refresh data
    };

    const renderMainContent = () => {
        const currentContract = selectedRecordId ? contracts.find(c => c.id === selectedRecordId) : null;

        if (!canAccess('screen', currentScreen) && !canAccess('dashboard', currentScreen)) {
            return (
                <div className="text-center" style={{padding: 'var(--spacing-xxl)', border: '1px dashed var(--error-color)', borderRadius: 'var(--border-radius-md)', margin: 'var(--spacing-xl) 0', backgroundColor: 'var(--status-rejected-light)'}}>
                    <FaLock size={64} style={{color: 'var(--error-color)', marginBottom: 'var(--spacing-md)'}} />
                    <h3 style={{color: 'var(--error-color)'}}>Access Denied</h3>
                    <p style={{color: 'var(--text-secondary)'}}>You do not have permission to view this page as a {ROLES[userRole].name}.</p>
                    <button className="button button-primary mt-lg" onClick={() => navigate(ROLES[userRole].sidebarNav[0].id)}>
                        Go to My Dashboard
                    </button>
                </div>
            );
        }

        switch (currentScreen) {
            case 'AdminDashboard':
            case 'LegalDashboard':
            case 'BusinessDashboard':
            case 'ApproverDashboard':
                return <Dashboard userRole={userRole} contracts={contracts} navigate={navigate} />;
            case 'ContractList':
                return <ContractList contracts={contracts} userRole={userRole} navigate={navigate} showToast={showToast} />;
            case 'ContractDetail':
                return <ContractDetail contract={currentContract} userRole={userRole} onBack={goBack} onEdit={id => navigate('ContractForm', id)} onUpdateStatus={handleUpdateContractStatus} showToast={showToast} />;
            case 'ContractForm':
                return <ContractForm
                    contract={currentContract}
                    userRole={userRole}
                    onSave={handleSaveContract}
                    onCancel={goBack}
                    showToast={showToast}
                    isCreatingNew={!selectedRecordId}
                />;
            case 'AuditLogs':
                return <AuditLogs auditLogs={dummyAuditLogs} userRole={userRole} />;
            case 'UserSettings':
                return <UserSettings userRole={userRole} showToast={showToast} />;
            default:
                return <p>Welcome to ContractFlow!</p>;
        }
    };

    const handleGlobalSearch = (e) => {
        setSearchQuery(e.target.value);
    };

    const filteredSearchResults = searchQuery
        ? contracts.filter(c =>
            c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.parties.join(', ').toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10) // Limit results for demo
        : [];

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="flex-row align-center gap-md">
                    <button className="button button-secondary menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} style={{display: 'none', color: 'var(--text-light)', border: 'none'}}>
                        {sidebarOpen ? <FaTimes /> : <FaBars />}
                    </button>
                    <h1>ContractFlow</h1>
                </div>
                <div className="header-actions">
                    <button className="button button-secondary" onClick={() => setShowGlobalSearch(true)}><FaSearch /> Global Search</button>
                    <div className="role-switcher">
                        <select value={userRole} onChange={handleRoleChange}>
                            {Object.entries(ROLES).map(([key, role]) => (
                                <option key={key} value={key}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                    <button className="button button-secondary" onClick={() => showToast('Notifications feature coming soon!', 'info')}><FaBell /></button>
                </div>
            </header>

            <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <nav className="sidebar-nav">
                    <ul>
                        {ROLES[userRole]?.sidebarNav.map(item => (
                            <li key={item.id}>
                                {canAccess('screen', item.id) || canAccess('dashboard', item.id) ? (
                                    <button
                                        className={currentScreen === item.id ? 'active' : ''}
                                        onClick={() => navigate(item.id)}
                                    >
                                        <item.icon /> {item.label}
                                    </button>
                                ) : (
                                    <button disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                        <item.icon /> {item.label} <FaLock style={{marginLeft: 'auto'}} />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>

            <main className="app-main-content">
                {renderMainContent()}
            </main>

            {showGlobalSearch && (
                <div className="global-search-overlay">
                    <div className="global-search-content">
                        <button className="search-close-button" onClick={() => { setShowGlobalSearch(false); setSearchQuery(''); }}>
                            <FaTimes />
                        </button>
                        <h3>Global Search</h3>
                        <input
                            type="search"
                            placeholder="Search contracts, users, logs..."
                            value={searchQuery}
                            onChange={handleGlobalSearch}
                            autoFocus
                        />
                        <div className="search-results">
                            {searchQuery && filteredSearchResults.length === 0 && (
                                <p>No results found for "{searchQuery}".</p>
                            )}
                            {filteredSearchResults.map(result => (
                                <div key={result.id} className="search-result-item" onClick={() => { navigate('ContractDetail', result.id); setShowGlobalSearch(false); setSearchQuery(''); }}>
                                    <span>{result.id}</span>
                                    {result.title} <small>- {CONTRACT_STATUSES[result.status]?.label}</small>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="toast-container">
                {notifications.map(notification => (
                    <NotificationToast
                        key={notification.id}
                        id={notification.id}
                        message={notification.message}
                        type={notification.type}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </div>
    );
};

export default App;