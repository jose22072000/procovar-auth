
export default function BaseLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="radial-bg min-h-svh">
            {children}
        </div>
    );
}
