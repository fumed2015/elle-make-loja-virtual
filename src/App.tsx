import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { CartDrawerProvider } from "@/components/cart/AddToCartDrawer";
import { lazy, Suspense } from "react";
import { ScrollToTop } from "@/components/ScrollToTop";

import AppLayout from "@/components/layout/AppLayout";
import TrackingPixelsInjector from "@/components/TrackingPixelsInjector";
import MetaPixelProvider from "@/components/MetaPixelProvider";
import Index from "./pages/Index";

// Lazy load non-critical routes
const Explorar = lazy(() => import("./pages/Explorar"));
const Produto = lazy(() => import("./pages/Produto"));
const Carrinho = lazy(() => import("./pages/Carrinho"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Pedidos = lazy(() => import("./pages/Pedidos"));
const Favoritos = lazy(() => import("./pages/Favoritos"));
const Admin = lazy(() => import("./pages/Admin"));
const Categoria = lazy(() => import("./pages/Categoria"));
const Marca = lazy(() => import("./pages/Marca"));
const Privacidade = lazy(() => import("./pages/Privacidade"));
const Termos = lazy(() => import("./pages/Termos"));
const Sobre = lazy(() => import("./pages/Sobre"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Consultora = lazy(() => import("./pages/Consultora"));
const RecuperarCarrinho = lazy(() => import("./pages/RecuperarCarrinho"));
const Ofertas = lazy(() => import("./pages/Ofertas"));
const TestPixel = lazy(() => import("./pages/TestPixel"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPostPage = lazy(() => import("./pages/BlogPost"));
const QuizBeleza = lazy(() => import("./pages/QuizBeleza"));
const Glossario = lazy(() => import("./pages/Glossario"));
const Catalogo = lazy(() => import("./pages/Catalogo"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);


const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CartDrawerProvider>
            <ScrollToTop />
            <TrackingPixelsInjector />
            <MetaPixelProvider />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/explorar" element={<Explorar />} />
                  <Route path="/produto/:slug" element={<Produto />} />
                  <Route path="/categoria/:slug" element={<Categoria />} />
                  <Route path="/marca/:slug" element={<Marca />} />
                  <Route path="/carrinho" element={<Carrinho />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/perfil" element={<Perfil />} />
                  <Route path="/pedidos" element={<Pedidos />} />
                  <Route path="/favoritos" element={<Favoritos />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/privacidade" element={<Privacidade />} />
                  <Route path="/termos" element={<Termos />} />
                  <Route path="/sobre" element={<Sobre />} />
                  <Route path="/consultora" element={<Consultora />} />
                  <Route path="/recuperar-carrinho" element={<RecuperarCarrinho />} />
                  <Route path="/ofertas" element={<Ofertas />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/quiz-beleza" element={<QuizBeleza />} />
                  <Route path="/glossario" element={<Glossario />} />
                  <Route path="/test-pixel" element={<TestPixel />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </CartDrawerProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
