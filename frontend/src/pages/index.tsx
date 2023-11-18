import axios from "axios"
import Head from "next/head"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useZuAuth } from "zuauth"
import { EdDSATicketFieldsToReveal } from "@pcd/zk-eddsa-event-ticket-pcd"
import Toggle from "@/components/Toggle"
import DisplayRevealedFields from "@/components/DisplayRevealedFields"
import DeveloperPanel from "@/components/DeveloperPanel"

const defaultSetOfTicketFieldsToReveal: EdDSATicketFieldsToReveal = {
    revealTicketId: false,
    revealEventId: true,
    revealProductId: true,
    revealTimestampConsumed: false,
    revealTimestampSigned: false,
    revealAttendeeSemaphoreId: false,
    revealIsConsumed: false,
    revealIsRevoked: false,
    revealTicketCategory: false,
    revealAttendeeEmail: true,
    revealAttendeeName: false
}

export default function Home() {
    const { authenticate, pcd } = useZuAuth()
    const [user, setUser] = useState<any>()
    const [developerMode, setDeveloperMode] = useState(false);
    const [ticketFieldsToReveal, setTicketFieldsToReveal] = useState<EdDSATicketFieldsToReveal>(defaultSetOfTicketFieldsToReveal);

    // Every time the page loads, an API call is made to check if the
    // user is logged in and, if they are, to retrieve the current session's user data
    // and local storage data (to guarantee consistency across refreshes).
    useEffect(() => {
        ; (async function () {
            const { data } = await axios.get("/api/user")
            setUser(data.user)

            const fields = localStorage.getItem("ticketFieldsToReveal");
            const mode = localStorage.getItem("developerMode")

            if (fields) setTicketFieldsToReveal(JSON.parse(fields));
            if (mode) setDeveloperMode(JSON.parse(mode))
        })()
    }, [])

    // When the popup is closed and the user successfully
    // generates the PCD, they can login.
    useEffect(() => {
        ; (async function () {
            if (pcd) {
                const { data } = await axios.post("/api/login", { pcd })
                setUser(data.user)
            }
        })()
    }, [pcd])

    // Before logging in, the PCD is generated with the nonce from the
    // session created on the server.
    // Note that the nonce is used as a watermark for the PCD. Therefore,
    // it will be necessary on the server side to verify that the PCD's
    // watermark matches the session nonce.
    const login = async () => {
        const { data } = await axios.post("/api/nonce")

        authenticate(
            developerMode ? { ...ticketFieldsToReveal } : { ...defaultSetOfTicketFieldsToReveal },
            data.nonce
        )
    }

    // Logging out simply clears the active session, local storage and state.
    const logout = async () => {
        await axios.post("/api/logout")
        setUser(false)

        localStorage.removeItem("ticketFieldsToReveal")
        localStorage.removeItem("developerMode")

        setTicketFieldsToReveal(defaultSetOfTicketFieldsToReveal)
        setDeveloperMode(false)
    }

    const handleToggleField = (fieldToReveal: keyof EdDSATicketFieldsToReveal) => {
        setTicketFieldsToReveal(prevState => {
            const fieldsToReveal = {
                ...prevState,
                [fieldToReveal]: !prevState[fieldToReveal]
            };

            localStorage.setItem("ticketFieldsToReveal", JSON.stringify(fieldsToReveal));
            return fieldsToReveal;
        });
    };

    const handleSetDeveloperMode = () => {
        setDeveloperMode(value => {
            const newValue = !value

            if (newValue) {
                localStorage.setItem("ticketFieldsToReveal", JSON.stringify(ticketFieldsToReveal));
            } else {
                setTicketFieldsToReveal(defaultSetOfTicketFieldsToReveal)
                localStorage.removeItem("ticketFieldsToReveal")
            }

            localStorage.setItem("developerMode", JSON.stringify(newValue))

            return newValue
        })
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-12 pb-32">
            <Head>
                <title>Tupac Battlefrogz</title>
                <link rel="icon" type="image/x-icon" href="/favicon.ico" />
            </Head>
            <div className="max-w-4xl w-full mx-auto">
                <div className="flex justify-center">
                    <Image width="512" height="512" alt="ZuAuth Icon" src="/logo.png" />
                </div>

                <h1 className="my-4 text-2xl font-semibold text-center">
                    Battlefrogz
                </h1>

                <div className="my-8 text-center">
                    <button
                        className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-2 px-4 rounded"
                        onClick={!user ? login : logout}
                    >
                        {!user ? "Choose your frog" : "Log out"}
                    </button>
                </div>


                {user && <div className="my-8 text-center">
                    <DisplayRevealedFields user={user} revealedFields={ticketFieldsToReveal} /> </div>}
            </div>
        </main >
    )
}