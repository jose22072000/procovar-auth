import FadeInImage from "../fade-in-image";
export function BackgroundGradient() {

    return (
        <div className="fixed inset-0 overflow-hidden bg-background -z-50">
            <div className="pointer-events-none absolute inset-0 -translate-x-[30%] -translate-y-[25%] scale-150 select-none sm:scale-125 opacity-0 dark:opacity-100 transition-opacity duration-1000">
                <FadeInImage
                    alt="Gradient background"
                    src="/bg-gradient.png"
                    fill
                />
            </div>
        </div>
    );
}