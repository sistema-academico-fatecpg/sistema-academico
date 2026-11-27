import type { FormEventHandler, ReactNode } from "react";
import { cn } from "@/web/lib/utils";
import styles from "./styles.module.scss";

type Padding = "p-0" | "p-4" | "p-5" | "p-6" | "p-8";

const PADDING_CLASS: Record<Padding, string> = {
  "p-0": styles.p0,
  "p-4": styles.p4,
  "p-5": styles.p5,
  "p-6": styles.p6,
  "p-8": styles.p8,
};

type CommonProps = {
  children: ReactNode;
  padding?: Padding;
  className?: string;
};

type ContainerProps = CommonProps & {
  as?: "div" | "section";
  method?: never;
  onSubmit?: never;
};

type FormProps = CommonProps & {
  as: "form";
  method?: "get" | "post";
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

/** Painel branco padrão. Formulários recebem atributos de formulário com segurança de tipo. */
export function Panel(props: ContainerProps | FormProps) {
  const { children, padding = "p-6", className } = props;
  const classes = cn(styles.panelBase, PADDING_CLASS[padding], className);

  if (props.as === "form") {
    return (
      <form className={classes} method={props.method} onSubmit={props.onSubmit}>
        {children}
      </form>
    );
  }

  const Element = props.as ?? "div";
  return <Element className={classes}>{children}</Element>;
}
