--
-- PostgreSQL database dump
--

\restrict vgNDAs9Y44Hy7MxnwKvkLu0CfxTK5EDKn2Ms1mKnWTr0FxW3VahVTYOPg9bQt1I

-- Dumped from database version 17.10 (Debian 17.10-1.pgdg13+1)
-- Dumped by pg_dump version 17.10 (Debian 17.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: products; Type: TABLE; Schema: public; Owner: pos_user
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL
);


ALTER TABLE public.products OWNER TO pos_user;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: pos_user
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO pos_user;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pos_user
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: pos_user
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: pos_user
--

COPY public.products (id, name, price) FROM stdin;
1	Beef Noodle Soup	13.99
2	Chicken Rice Plate	11.99
3	Pork Dumplings	8.99
4	Milk Tea	4.99
5	Beef Noodle Soup	13.99
6	Chicken Rice Plate	11.99
7	Pork Dumplings	8.99
8	Milk Tea	4.99
\.


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pos_user
--

SELECT pg_catalog.setval('public.products_id_seq', 8, true);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: pos_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict vgNDAs9Y44Hy7MxnwKvkLu0CfxTK5EDKn2Ms1mKnWTr0FxW3VahVTYOPg9bQt1I

