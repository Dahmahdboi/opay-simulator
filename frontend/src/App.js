import React, { useState, useEffect } from 'react';

// This will be the URL of the backend you deployed on Render.
// We will set this in Vercel's settings so you don't have to write it here.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

// --- Main App Component ---
export default function App() {
    const [page, setPage] = useState('splash'); // splash, auth, main
    const [mainView, setMainView] = useState('dashboard');
    const [isLoginView, setIsLoginView] = useState(true);
    const [userData, setUserData] = useState(null); // This will hold our logged-in user's data

    // Effect to move from splash screen to auth
    useEffect(() => {
        const session = JSON.parse(localStorage.getItem('opay_session'));
        if (session) {
            setUserData(session);
            setPage('main');
        } else {
            setTimeout(() => setPage('auth'), 2000);
        }
    }, []);

    // --- Core Logic ---
    const handleAuthAction = async (e) => {
        e.preventDefault();
        const { username, password, referralCode } = e.target.elements;

        const endpoint = isLoginView ? 'login' : 'signup';
        const body = {
            username: username.value,
            password: password.value,
        };
        if (!isLoginView) {
            body.referralCode = referralCode.value;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            alert(data.message);
            if (isLoginView) {
                // Login successful, save session and go to main app
                localStorage.setItem('opay_session', JSON.stringify(data.user));
                setUserData(data.user);
                setPage('main');
            } else {
                // Signup successful, switch to login view
                setIsLoginView(true);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('opay_session');
        setUserData(null);
        setPage('auth');
    };
    
    // Function to refetch user data after a transaction
    const refreshUserData = async () => {
        if(!userData) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/user/${userData.username}`);
            const data = await response.json();
            if(response.ok) {
                localStorage.setItem('opay_session', JSON.stringify(data));
                setUserData(data);
            }
        } catch(error) {
            console.error("Failed to refresh user data:", error);
        }
    };


    // --- Render Logic ---
    switch (page) {
        case 'splash':
            return <SplashScreen />;
        case 'auth':
            return <AuthScreen isLoginView={isLoginView} setIsLoginView={setIsLoginView} handleAuthAction={handleAuthAction} />;
        case 'main':
            if (!userData) return <SplashScreen />; // Should not happen, but a good fallback
            return <MainApp userData={userData} mainView={mainView} setMainView={setMainView} handleLogout={handleLogout} refreshUserData={refreshUserData} />;
        default:
            return <SplashScreen />;
    }
}

// --- Components (Largely the same as before, but adapted for the new data flow) ---

const SplashScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-green-500 text-white">
        <svg width="180" height="60" viewBox="0 0 180 60" className="mb-4">
            <text x="0" y="50" fontFamily="Inter, sans-serif" fontSize="50" fontWeight="bold" fill="white">O</text>
            <text x="35" y="50" fontFamily="Inter, sans-serif" fontSize="50" fontWeight="normal" fill="white">Pay</text>
        </svg>
        <p className="mt-2 text-lg">Your financial freedom starts here</p>
    </div>
);

const AuthScreen = ({ isLoginView, setIsLoginView, handleAuthAction }) => (
    <div className="p-6 h-screen flex flex-col justify-center max-w-sm mx-auto">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">{isLoginView ? 'Login' : 'Sign Up'}</h2>
        <form onSubmit={handleAuthAction}>
            <input name="username" type="text" placeholder="Username" className="w-full p-3 mb-4 bg-gray-100 rounded-lg border" required />
            <input name="password" type="password" placeholder="Password" className="w-full p-3 mb-4 bg-gray-100 rounded-lg border" required />
            {!isLoginView && (
                <input name="referralCode" type="text" placeholder="Referral Code (Optional)" className="w-full p-3 mb-4 bg-gray-100 rounded-lg border" />
            )}
            <button type="submit" className="w-full bg-green-500 text-white p-3 rounded-lg font-semibold hover:bg-green-600">
                {isLoginView ? 'Login' : 'Sign Up'}
            </button>
        </form>
        <p className="text-center mt-4">
            <button onClick={() => setIsLoginView(!isLoginView)} className="text-green-500">
                {isLoginView ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
        </p>
    </div>
);

const MainApp = ({ userData, mainView, setMainView, handleLogout, refreshUserData }) => {
     const renderMainView = () => {
        switch (mainView) {
            case 'dashboard':
                return <DashboardView userData={userData} setMainView={setMainView} />;
            case 'transfer':
                return <TransferView userData={userData} setMainView={setMainView} refreshUserData={refreshUserData} />;
            // Add other cases here
            default:
                return <DashboardView userData={userData} setMainView={setMainView} />;
        }
    };
    
    return (
        <div className="h-screen flex flex-col max-w-sm mx-auto shadow-lg">
            <header className="flex items-center justify-between p-4 bg-white shadow-md">
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {userData.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="ml-3 font-semibold text-gray-800">Hi, {userData.username}</span>
                </div>
                <button onClick={handleLogout} className="text-sm text-red-500">Logout</button>
            </header>
            <main className="flex-grow overflow-y-auto p-4 bg-gray-50">
                {renderMainView()}
            </main>
            <BottomNav mainView={mainView} setMainView={setMainView} />
        </div>
    );
};

const DashboardView = ({ userData, setMainView }) => (
    <div>
        <div className="bg-green-500 text-white rounded-xl p-6 mb-6 shadow-lg">
            <p className="text-sm opacity-80">Available Balance</p>
            <h2 className="text-4xl font-bold mt-1">₦{userData.balance.toLocaleString('en-US')}</h2>
            <p className="text-xs mt-2">Account Number: {userData.accountNumber}</p>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center text-gray-700">
             <button onClick={() => setMainView('transfer')} className="flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-1"><svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
                <span className="text-xs">Transfer</span>
            </button>
            {/* Add more service buttons here */}
        </div>
    </div>
);

const TransferView = ({ userData, setMainView, refreshUserData }) => {
    const [recipientAcc, setRecipientAcc] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');

    const handleTransfer = async (e) => {
        e.preventDefault();
        setError('');
        if (!recipientAcc) return setError("Please enter an account number.");
        
        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) return setError("Please enter a valid amount.");
        if (userData.balance < transferAmount) return setError("Insufficient balance.");

        try {
            const response = await fetch(`${BACKEND_URL}/api/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromUsername: userData.username,
                    toAccountNumber: recipientAcc,
                    amount: transferAmount
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            alert('Transfer successful!');
            await refreshUserData(); // Refresh data to show new balance
            setMainView('dashboard');

        } catch (error) {
            setError(`Transfer failed: ${error.message}`);
        }
    };

    return (
        <div>
            <button onClick={() => setMainView('dashboard')} className="text-green-500 mb-4">&larr; Back</button>
            <h2 className="text-2xl font-bold mb-6">Transfer Money</h2>
            <form onSubmit={handleTransfer} className="space-y-4">
                <p className="text-sm p-3 bg-blue-50 text-blue-800 rounded-lg">Your Balance: <strong>₦{userData.balance.toLocaleString('en-US')}</strong></p>
                <div>
                    <label className="block text-sm font-medium">Recipient Account Number</label>
                    <input value={recipientAcc} onChange={(e) => setRecipientAcc(e.target.value)} type="number" placeholder="Enter account number" className="w-full p-3 bg-gray-100 rounded-lg border mt-1" required/>
                </div>
                 <div>
                    <label className="block text-sm font-medium">Amount</label>
                    <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="Amount to send" className="w-full p-3 bg-gray-100 rounded-lg border mt-1" required/>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-green-500 text-white p-3 rounded-lg font-semibold hover:bg-green-600">Send Money</button>
            </form>
        </div>
    );
};

const BottomNav = ({ mainView, setMainView }) => {
    const navItems = [
        { id: 'dashboard', label: 'Home', icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg> },
        { id: 'transactions', label: 'History', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg> },
        { id: 'profile', label: 'Me', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> }
    ];

    return (
        <nav className="flex justify-around bg-white shadow-t-md p-2">
            {navItems.map(item => (
                <button 
                    key={item.id} 
                    onClick={() => setMainView(item.id)}
                    className={`flex flex-col items-center transition-colors ${mainView === item.id ? 'text-green-500' : 'text-gray-500'}`}
                >
                    {item.icon}
                    <span className="text-xs">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};

