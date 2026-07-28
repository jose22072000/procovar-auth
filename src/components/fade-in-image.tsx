"use client";

/* eslint-disable jsx-a11y/alt-text */

import { LazyMotion, domAnimation, m, useAnimation } from "framer-motion";
import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

const animationVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

export const FadeInImage = (props: ImageProps) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const animationControls = useAnimation();

    useEffect(() => {
        if (isLoaded) {
            animationControls.start("visible");
        }
    }, [isLoaded]);

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                animate={animationControls}
                initial="hidden"
                transition={{ duration: 0.5, ease: "easeOut" }}
                variants={animationVariants}
                className={props.fill ? "relative w-full h-full" : undefined}
            >
                <Image {...props} onLoad={(e) => {
                    setIsLoaded(true);
                    if (props.onLoad) {
                        props.onLoad(e);
                    }
                }} />
            </m.div>
        </LazyMotion>
    );
};

export default FadeInImage;
