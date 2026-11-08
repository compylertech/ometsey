import { useState } from "react"
import { Link } from "react-router-dom"
import { Field, OutlineButton } from "@/components/Form"

type Mode = "signin" | "register" | "forgot";

const TITLES: Record<Mode, string> = {
    signin: "Sign in to access your account",
    register: "Create your account",
    forgot: "Reset your password",
};

/** Full-page split layout, as on the reference: no site header, just a way back. */
export function Account() {
    const [mode, setMode] = useState<Mode>("signin");
    const [notice, setNotice] = useState(false);
    const go = (m: Mode) => { setMode(m); setNotice(false); };

    return (
        <div className="grid min-h-screen md:grid-cols-2">
            <div className="px-6 pb-16 pt-8 md:px-10">
                <Link to="/" className="text-[13px]">‹&nbsp;&nbsp;Back to Home</Link>
                <h1 className="mt-24 text-[20px] font-normal">{TITLES[mode]}</h1>
                <form className="mt-10 max-w-md space-y-6" onSubmit={(e) => { e.preventDefault(); setNotice(true); }}>
                    {mode === "register" && (
                        <>
                            <Field label="First name*" required />
                            <Field label="Last name*" required />
                        </>
                    )}
                    <Field label="Email*" type="email" required />
                    {mode !== "forgot" && <Field label="Password*" type="password" required />}
                    <div className="flex items-center gap-6">
                        <OutlineButton type="submit">{mode === "signin" ? "Sign In" : mode === "register" ? "Create Account" : "Send reset link"}</OutlineButton>
                        {mode === "signin" && <button type="button" onClick={() => go("forgot")} className="border-b border-black text-[12px]">Forgot your password?</button>}
                        {mode === "forgot" && <button type="button" onClick={() => go("signin")} className="border-b border-black text-[12px]">Back to sign in</button>}
                    </div>
                    {notice && <p className="text-[12px] leading-5 text-black/60">Accounts aren’t connected to the store yet, so nothing was submitted.</p>}
                </form>
                {mode === "signin" && (
                    <div className="mt-24">
                        <p className="mb-4 text-[14px]">Don’t have an account?</p>
                        <OutlineButton onClick={() => go("register")}>Create Account</OutlineButton>
                    </div>
                )}
                {mode === "register" && (
                    <div className="mt-24">
                        <p className="mb-4 text-[14px]">Already have an account?</p>
                        <OutlineButton onClick={() => go("signin")}>Sign In</OutlineButton>
                    </div>
                )}
            </div>
            <img src="/images/hero/slide-2.jpeg" alt="" className="hidden h-full min-h-screen w-full object-cover md:block" />
        </div>
    );
}
