import React, { useState } from 'react';
import { UserAccount, FeatureAccessConfig, SubscriptionPlan, UserRole } from '../types';

interface AdminDashboardSettingsProps {
  currentUserEmail: string;
  currentRole: UserRole;
  currentPlan: SubscriptionPlan;
  usersList: UserAccount[];
  featureConfig: FeatureAccessConfig;
  onUpdateUserRole: (userId: string, newRole: UserRole) => void;
  onUpdateUserPlan: (userId: string, newPlan: SubscriptionPlan) => void;
  onUpdateFeatureConfig: (newConfig: FeatureAccessConfig) => void;
  onToggleSimulateRegularUser: () => void;
  isSimulatingRegular: boolean;
  onOpenPayPalModal: () => void;
  showToast: (msg: string) => void;
}

export const AdminDashboardSettings: React.FC<AdminDashboardSettingsProps> = ({
  currentUserEmail,
  currentRole,
  currentPlan,
  usersList,
  featureConfig,
  onUpdateUserRole,
  onUpdateUserPlan,
  onUpdateFeatureConfig,
  onToggleSimulateRegularUser,
  isSimulatingRegular,
  onOpenPayPalModal,
  showToast,
}) => {
  const [activeAdminSubtab, setActiveAdminSubtab] = useState<'users' | 'entitlements' | 'paypal' | 'metrics'>('users');
  
  // New user registration state for admin
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserPlan, setNewUserPlan] = useState<SubscriptionPlan>('regular');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Calculated metrics
  const totalUsers = usersList.length;
  const regularUsersCount = usersList.filter(u => u.subscription === 'regular').length;
  const proUsersCount = usersList.filter(u => u.subscription === 'pro').length;
  const enterpriseUsersCount = usersList.filter(u => u.subscription === 'enterprise').length;
  const mrr = (proUsersCount * 9.99) + (enterpriseUsersCount * 29.99);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserName.trim()) return;

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      subscription: newUserPlan,
      createdAt: new Date().toLocaleDateString(),
      status: 'active',
    };

    // Update parent / local storage via callback or state
    usersList.push(newUser);
    localStorage.setItem('bolek_registered_users', JSON.stringify(usersList));

    setNewUserName('');
    setNewUserEmail('');
    setShowAddUserModal(false);
    showToast(`User ${newUser.name} created with ${newUser.subscription} plan!`);
  };

  return (
    <div className="w-full h-full flex flex-col bg-stone-50 overflow-hidden text-stone-800">
      
      {/* Top Admin Navigation Header */}
      <div className="bg-stone-900 text-white p-5 shrink-0 border-b border-stone-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <span className="material-symbols-outlined !text-xl">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-white">Admin Dashboard Settings</h2>
              <span className="bg-orange-500 text-stone-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
                ADMIN LEVEL
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Logged in as <strong className="text-white">{currentUserEmail}</strong> • Manage roles, subscription tiers, and PayPal settings
            </p>
          </div>
        </div>

        {/* Simulation Mode Toggle Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSimulateRegularUser}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
              isSimulatingRegular
                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400 animate-pulse'
                : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-700'
            }`}
          >
            <span className="material-symbols-outlined !text-base">
              {isSimulatingRegular ? 'visibility_off' : 'visibility'}
            </span>
            <span>
              {isSimulatingRegular ? 'Exit Simulation Mode' : 'Test Regular User Mode'}
            </span>
          </button>

          <button
            onClick={onOpenPayPalModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined !text-base">payments</span>
            <span>PayPal Gateway</span>
          </button>
        </div>
      </div>

      {/* Simulation Banner Warning */}
      {isSimulatingRegular && (
        <div className="bg-amber-500 text-stone-950 px-5 py-2 text-xs font-bold flex items-center justify-between shrink-0 border-b border-amber-600">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined !text-base">info</span>
            <span>Simulating Regular User View: You are currently testing permissions as a Regular Free User. Clicking BolekAuth or Boleksend will show the Paywall Popup!</span>
          </span>
          <button 
            onClick={onToggleSimulateRegularUser}
            className="underline text-stone-900 font-extrabold hover:text-black cursor-pointer"
          >
            Return to Admin Mode
          </button>
        </div>
      )}

      {/* Admin Subtabs Bar */}
      <div className="flex items-center gap-2 px-6 pt-4 bg-white border-b border-stone-200 shrink-0">
        <button
          onClick={() => setActiveAdminSubtab('users')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeAdminSubtab === 'users'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="material-symbols-outlined !text-base">group</span>
          <span>User Management ({totalUsers})</span>
        </button>

        <button
          onClick={() => setActiveAdminSubtab('entitlements')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeAdminSubtab === 'entitlements'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="material-symbols-outlined !text-base">shield</span>
          <span>Regular vs Paid Features</span>
        </button>

        <button
          onClick={() => setActiveAdminSubtab('paypal')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeAdminSubtab === 'paypal'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="material-symbols-outlined !text-base">account_balance</span>
          <span>PayPal & Billing Settings</span>
        </button>

        <button
          onClick={() => setActiveAdminSubtab('metrics')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-2 ${
            activeAdminSubtab === 'metrics'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span className="material-symbols-outlined !text-base">analytics</span>
          <span>Subscription Analytics</span>
        </button>
      </div>

      {/* Subtab Viewports */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        {/* SUBTAB 1: User Management */}
        {activeAdminSubtab === 'users' && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-stone-900">Registered Users & Role Management</h3>
                <p className="text-xs text-stone-500">Configure admin roles and upgrade standard users to Pro/Enterprise</p>
              </div>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined !text-base">person_add</span>
                <span>Add New User</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-white border border-stone-200 rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">System Role</th>
                    <th className="p-3.5">Subscription Plan</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {usersList.map((user) => {
                    const isSelf = user.email === currentUserEmail;
                    return (
                      <tr key={user.id} className="hover:bg-stone-50/80 transition">
                        <td className="p-3.5 font-bold text-stone-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{user.name} {isSelf && <span className="text-[10px] text-orange-600 font-bold">(You)</span>}</div>
                            <div className="text-[10px] text-stone-400 font-normal">Joined {user.createdAt}</div>
                          </div>
                        </td>

                        <td className="p-3.5 font-mono text-stone-600">{user.email}</td>

                        <td className="p-3.5">
                          <select
                            value={user.role}
                            onChange={(e) => onUpdateUserRole(user.id, e.target.value as UserRole)}
                            className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                          >
                            <option value="user">Regular User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        <td className="p-3.5">
                          <select
                            value={user.subscription}
                            onChange={(e) => onUpdateUserPlan(user.id, e.target.value as SubscriptionPlan)}
                            className={`border rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none cursor-pointer ${
                              user.subscription === 'enterprise'
                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                : user.subscription === 'pro'
                                ? 'bg-orange-50 border-orange-300 text-orange-900'
                                : 'bg-stone-50 border-stone-300 text-stone-700'
                            }`}
                          >
                            <option value="regular">Regular (Free)</option>
                            <option value="pro">Pro ($9.99/mo)</option>
                            <option value="enterprise">Enterprise ($29.99/mo)</option>
                          </select>
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              const newPlan = user.subscription === 'regular' ? 'pro' : 'regular';
                              onUpdateUserPlan(user.id, newPlan);
                              showToast(`Toggled ${user.name} to ${newPlan}`);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200 transition cursor-pointer"
                          >
                            {user.subscription === 'regular' ? 'Grant Pro' : 'Downgrade'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 2: Feature Entitlements */}
        {activeAdminSubtab === 'entitlements' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h3 className="font-bold text-base text-stone-900">Regular vs Paid Feature Access Rules</h3>
              <p className="text-xs text-stone-500">
                Configure which tools Regular free users can access versus features requiring a Pro/Enterprise payment.
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="text-xs font-bold text-stone-900 uppercase tracking-wider text-[11px] pb-2 border-b border-stone-100">
                Standard Free Access (Regular Users)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">Dashboard (Bolek Canvas)</span>
                    <span className="text-[11px] text-stone-500">Widgets, quick notes, search</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={featureConfig.dashboard}
                    onChange={(e) => onUpdateFeatureConfig({ ...featureConfig, dashboard: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">BolekDash (Notes)</span>
                    <span className="text-[11px] text-stone-500">Columns & sticky cards</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={featureConfig.notes}
                    onChange={(e) => onUpdateFeatureConfig({ ...featureConfig, notes: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">Calendar Workspace</span>
                    <span className="text-[11px] text-stone-500">Events & task deadlines</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={featureConfig.calendar}
                    onChange={(e) => onUpdateFeatureConfig({ ...featureConfig, calendar: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">Profile & Settings</span>
                    <span className="text-[11px] text-stone-500">User info & basic options</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={featureConfig.profile}
                    onChange={(e) => onUpdateFeatureConfig({ ...featureConfig, profile: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                </label>
              </div>

              <div className="text-xs font-bold text-orange-900 uppercase tracking-wider text-[11px] pt-4 pb-2 border-b border-stone-100 flex items-center justify-between">
                <span>Paid Upgrade Features (Triggers PayPal Paywall)</span>
                <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">Require Pro/Enterprise</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3.5 bg-orange-50/50 border border-orange-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">Boleksend Email Suite</span>
                    <span className="text-[11px] text-stone-500">Bulk emailer & Zoho SMTP relay</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-500">{featureConfig.send ? 'Allowed for Regulars' : 'Locked for Regulars'}</span>
                    <input
                      type="checkbox"
                      checked={featureConfig.send}
                      onChange={(e) => onUpdateFeatureConfig({ ...featureConfig, send: e.target.checked })}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </div>
                </label>

                <label className="flex items-center justify-between p-3.5 bg-orange-50/50 border border-orange-200 rounded-xl cursor-pointer">
                  <div>
                    <span className="font-bold text-stone-900 block">BolekAuth Manager</span>
                    <span className="text-[11px] text-stone-500">2FA, OTP, TOTP vault & passkeys</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-500">{featureConfig.bolekauth ? 'Allowed for Regulars' : 'Locked for Regulars'}</span>
                    <input
                      type="checkbox"
                      checked={featureConfig.bolekauth}
                      onChange={(e) => onUpdateFeatureConfig({ ...featureConfig, bolekauth: e.target.checked })}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: PayPal & Billing Settings */}
        {activeAdminSubtab === 'paypal' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h3 className="font-bold text-base text-stone-900">PayPal Developer Sandbox & API Gateway</h3>
              <p className="text-xs text-stone-500">
                Integration configuration based on developer.paypal.com/llms.txt standard
              </p>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-600 !text-2xl">verified</span>
                  <div>
                    <p className="font-bold text-xs">PayPal LLMs Developer Standard Connected</p>
                    <p className="text-[11px] text-blue-700">Endpoint: https://developer.paypal.com/llms.txt</p>
                  </div>
                </div>
                <button
                  onClick={onOpenPayPalModal}
                  className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition cursor-pointer"
                >
                  Test Payment Checkout
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 text-xs mb-1">PayPal Client ID</label>
                  <input
                    type="text"
                    readOnly
                    value="BOLEK_PAYPAL_SANDBOX_CLIENT_ID_9812A"
                    className="w-full px-3 py-2 bg-stone-100 border border-stone-300 rounded-xl text-xs font-mono text-stone-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-xs mb-1">Webhook Secret Key</label>
                  <input
                    type="password"
                    readOnly
                    value="whsec_paypal_demo_key_991823"
                    className="w-full px-3 py-2 bg-stone-100 border border-stone-300 rounded-xl text-xs font-mono text-stone-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: Metrics */}
        {activeAdminSubtab === 'metrics' && (
          <div className="space-y-6 max-w-5xl">
            <div>
              <h3 className="font-bold text-base text-stone-900">Subscription & Revenue Metrics</h3>
              <p className="text-xs text-stone-500">Live breakdown of free vs paid user conversions</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs">
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Registered Users</div>
                <div className="text-2xl font-extrabold text-stone-900">{totalUsers}</div>
              </div>

              <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs">
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Regular (Free) Users</div>
                <div className="text-2xl font-extrabold text-stone-700">{regularUsersCount}</div>
              </div>

              <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs">
                <div className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Pro Subscribers ($9.99)</div>
                <div className="text-2xl font-extrabold text-orange-600">{proUsersCount}</div>
              </div>

              <div className="p-4 bg-white border border-stone-200 rounded-2xl shadow-xs">
                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Est. Monthly Revenue (MRR)</div>
                <div className="text-2xl font-extrabold text-amber-600">${mrr.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-base text-stone-900">Add New User Account</h4>

            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  placeholder="e.g. Jane Smith"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  placeholder="jane@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  >
                    <option value="user">Regular User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Subscription</label>
                  <select
                    value={newUserPlan}
                    onChange={(e) => setNewUserPlan(e.target.value as SubscriptionPlan)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs"
                  >
                    <option value="regular">Regular (Free)</option>
                    <option value="pro">Pro ($9.99/mo)</option>
                    <option value="enterprise">Enterprise ($29.99/mo)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
