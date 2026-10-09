package com.aiinterview.backend.auth;

import com.aiinterview.backend.user.User;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        // Support both @AuthenticationPrincipal (Spring Security) and @RequestAttribute (custom)
        boolean hasAuthPrincipal = parameter.getParameterAnnotation(AuthenticationPrincipal.class) != null;
        boolean hasRequestAttr = parameter.getParameterAnnotation(RequestAttribute.class) != null;
        boolean isUserType = parameter.getParameterType().equals(User.class);
        
        return isUserType && (hasAuthPrincipal || hasRequestAttr);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        // First try Spring Security's AuthenticationPrincipal
        if (parameter.getParameterAnnotation(AuthenticationPrincipal.class) != null) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User user) {
                return user;
            }
        }
        
        // Fallback to RequestAttribute (for backward compatibility)
        if (parameter.getParameterAnnotation(RequestAttribute.class) != null) {
            Object attr = webRequest.getAttribute("currentUser", NativeWebRequest.SCOPE_REQUEST);
            if (attr instanceof User user) {
                return user;
            }
        }
        
        return null;
    }
}